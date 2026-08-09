import React, { useEffect } from 'react';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SvgProps } from 'react-native-svg';

import { CrossfadeFrames } from './CrossfadeFrames';
import { LockedIcon } from './icons/LockedIcon';
import * as BasicFrames from './frames-generated/body';
import * as AvocadoFrames from './frames-generated/variations/avocado';
import * as EggFrames from './frames-generated/variations/egg';
import * as FightingFrames from './frames-generated/variations/fighting';
import * as ToiletFrames from './frames-generated/variations/toilet';

/**
 * Mood drives which hand-drawn art state the companion shows, on top of a
 * gentle motion pass that varies with how urgent the moment is.
 */
export type CapyMood = 'idle' | 'working' | 'paused' | 'celebrating';

/**
 * Which companion's art to render. Every skin is a set of self-contained
 * compositions from the Figma "capy anim" frame library — each frame is a
 * full drawing with body, costume and head already combined, never layered
 * here. 'basic' lives under frames-generated/body (the Figma section names
 * the plain, costume-less capybara "body"; it is a whole character, not a
 * headless torso).
 */
export type CapySkin = 'basic' | 'egg' | 'fighting' | 'toilet' | 'avocado';

const SKINS: readonly CapySkin[] = ['basic', 'egg', 'fighting', 'toilet', 'avocado'];

/** A companion's mood, mapped to the Figma-named art state (idle/mad/dance) it renders. */
type FrameState = 'idle' | 'mad' | 'dance';

function frameStateForMood(mood: CapyMood): FrameState {
  if (mood === 'paused') return 'mad';
  if (mood === 'celebrating') return 'dance';
  return 'idle';
}

interface FrameSet {
  Idle1: ComponentType<SvgProps>;
  Idle2: ComponentType<SvgProps>;
  Mad1?: ComponentType<SvgProps>;
  Mad2?: ComponentType<SvgProps>;
  Dance1?: ComponentType<SvgProps>;
  Dance2?: ComponentType<SvgProps>;
}

/**
 * width / height of each skin's Figma frame export, so CrossfadeFrames can
 * size proportionally from a single height prop.
 *
 * Keyed per *state*, not just per skin: a dancing capybara throws its arms
 * out and its frames are meaningfully wider than its idle ones (130 vs 115
 * for basic and fighting), while egg and avocado crouch shorter to dance
 * (297 vs 308). Sizing every state at the idle ratio would letterbox the
 * dance rather than let it spread.
 */
const FRAME_ASPECT_RATIO: Record<CapySkin, Record<FrameState, number>> = {
  basic: { idle: 115 / 206, mad: 115 / 205, dance: 130 / 206 },
  fighting: { idle: 115 / 206, mad: 115 / 205, dance: 130 / 206 },
  egg: { idle: 234 / 308, mad: 234 / 297, dance: 234 / 297 },
  avocado: { idle: 234 / 308, mad: 234 / 297, dance: 234 / 297 },
  toilet: { idle: 249 / 276, mad: 249 / 276, dance: 249 / 276 },
};

const FRAME_SETS: Record<CapySkin, FrameSet> = {
  basic: BasicFrames,
  egg: EggFrames,
  fighting: FightingFrames,
  toilet: ToiletFrames,
  avocado: AvocadoFrames,
};

export interface ResolvedArt {
  /** The state actually rendered, which may differ from the one the mood asked for. */
  state: FrameState;
  frames: readonly [ComponentType<SvgProps>, ComponentType<SvgProps>];
  aspectRatio: number;
}

/**
 * Picks the frame pair and its matching proportions in one step.
 *
 * Not every skin has art for every mood — Toilet Capy is idle-only — so the
 * requested state can fall back to idle. Resolving the frames and the aspect
 * ratio together is what keeps a fallback from being drawn at the proportions
 * of the state it failed to find.
 */
export function resolveArt(mood: CapyMood, skin: CapySkin): ResolvedArt {
  const wanted = frameStateForMood(mood);
  const frames = FRAME_SETS[skin];

  const state: FrameState =
    wanted === 'mad' && frames.Mad1 && frames.Mad2
      ? 'mad'
      : wanted === 'dance' && frames.Dance1 && frames.Dance2
        ? 'dance'
        : 'idle';

  const pair =
    state === 'mad'
      ? ([frames.Mad1!, frames.Mad2!] as const)
      : state === 'dance'
        ? ([frames.Dance1!, frames.Dance2!] as const)
        : ([frames.Idle1, frames.Idle2] as const);

  return { state, frames: pair, aspectRatio: FRAME_ASPECT_RATIO[skin][state] };
}

/** A companion's `id` is a plain string in the store; an unrecognized one falls back to basic rather than crashing. */
export function skinForCompanionId(id: string): CapySkin {
  return (SKINS as readonly string[]).includes(id) ? (id as CapySkin) : 'basic';
}

export interface CapyMascotProps {
  /** Rendered height; width follows the illustration's aspect ratio. */
  size?: number;
  mood?: CapyMood;
  skin?: CapySkin;
  locked?: boolean;
}

const NATURAL_HEIGHT = 206;
const LOCKED_OPACITY = 0.4;

/**
 * The widest state a skin ever reaches, so the container can be reserved once
 * and stay put. Sizing it to the current state instead would make the layout
 * lurch sideways the moment the capybara threw its arms out to dance.
 */
const WIDEST_ASPECT: Record<CapySkin, number> = Object.fromEntries(
  Object.entries(FRAME_ASPECT_RATIO).map(([skin, states]) => [skin, Math.max(...Object.values(states))]),
) as Record<CapySkin, number>;

/** Faster crossfades read as more energy: a dance should flicker, a doze should drift. */
const CYCLE_MS: Record<FrameState, number> = {
  idle: 1800,
  mad: 1100,
  dance: 640,
};

export function CapyMascot({
  size = NATURAL_HEIGHT,
  mood = 'idle',
  skin = 'basic',
  locked = false,
}: CapyMascotProps) {
  const art = resolveArt(mood, skin);
  const containerWidth = size * WIDEST_ASPECT[skin];

  const bob = useSharedValue(0);

  useEffect(() => {
    // Cancel whatever the previous mood was doing before starting the next.
    bob.value = withTiming(0, { duration: 150 });

    // The drawn frames carry the mood now; this is just the breath underneath
    // them. Working breathes faster than idle, which is the only thing that
    // separates those two moods visually — they share the same art.
    if (mood === 'idle' || mood === 'working') {
      const duration = mood === 'working' ? 1600 : 2400;
      bob.value = withRepeat(
        withSequence(
          withTiming(-3, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }

    if (mood === 'celebrating') {
      bob.value = withRepeat(
        withSequence(
          withTiming(-14, { duration: 320, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 320, easing: Easing.bounce }),
        ),
        -1,
        false,
      );
    }

    // 'paused' deliberately holds still: the mad frames already say it, and
    // tilting a drawing that is visibly cross reads as falling over.
  }, [mood, bob]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));

  return (
    <View style={[styles.container, { width: containerWidth, height: size }]}>
      <Animated.View style={[animatedStyle, locked && styles.dimmed]}>
        <CrossfadeFrames
          FrameA={art.frames[0]}
          FrameB={art.frames[1]}
          height={size}
          aspectRatio={art.aspectRatio}
          cycleDuration={CYCLE_MS[art.state]}
        />
      </Animated.View>

      {locked && (
        <View style={styles.lockOverlay}>
          <LockedIcon width={size * 0.25 * (52 / 63)} height={size * 0.25} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: LOCKED_OPACITY,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
});
