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
import { CapyMascotIcon } from './icons/CapyMascotIcon';
import { LockedIcon } from './icons/LockedIcon';
import * as AvocadoFrames from './frames-generated/variations/avocado';
import * as EggFrames from './frames-generated/variations/egg';
import * as FightingFrames from './frames-generated/variations/fighting';
import * as ToiletFrames from './frames-generated/variations/toilet';

/**
 * Mood is expressed through motion rather than separate artwork — capy-ui
 * ships a single static mascot, so idle/working/paused/celebrating are the
 * same drawing under different animations.
 */
export type CapyMood = 'idle' | 'working' | 'paused' | 'celebrating';

/**
 * Which companion's art to render. 'basic' is the ported capy-ui mascot;
 * 'egg', 'fighting', 'toilet' and 'avocado' are self-contained compositions
 * sourced from the Figma "capy anim" frame library (each a full drawing —
 * body, costume and head already combined per frame, not layered here).
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

/** Skins with no mad/dance art yet (e.g. Toilet Capy) hold their idle pose regardless of mood. */
function pickFrames(state: FrameState, frames: FrameSet): readonly [ComponentType<SvgProps>, ComponentType<SvgProps>] {
  if (state === 'mad' && frames.Mad1 && frames.Mad2) return [frames.Mad1, frames.Mad2];
  if (state === 'dance' && frames.Dance1 && frames.Dance2) return [frames.Dance1, frames.Dance2];
  return [frames.Idle1, frames.Idle2];
}

/** width / height of each skin's Figma frame export, so CrossfadeFrames can size proportionally from a single height prop. */
const FRAME_ASPECT_RATIO: Record<'avocado' | 'egg' | 'fighting' | 'toilet', number> = {
  avocado: 234 / 308,
  egg: 234 / 308,
  fighting: 115 / 206,
  toilet: 249 / 276,
};

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

const NATURAL_WIDTH = 110;
const NATURAL_HEIGHT = 206;
const LOCKED_OPACITY = 0.4;

export function CapyMascot({
  size = NATURAL_HEIGHT,
  mood = 'idle',
  skin = 'basic',
  locked = false,
}: CapyMascotProps) {
  const width = (size * NATURAL_WIDTH) / NATURAL_HEIGHT;

  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);

  useEffect(() => {
    // Cancel whatever the previous mood was doing before starting the next.
    bob.value = withTiming(0, { duration: 150 });
    tilt.value = withTiming(0, { duration: 150 });

    if (mood === 'idle' || mood === 'working') {
      // Slow breathing; working breathes a little faster.
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

    if (mood === 'paused') {
      tilt.value = withTiming(-4, { duration: 400, easing: Easing.out(Easing.quad) });
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
  }, [mood, bob, tilt]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotate: `${tilt.value}deg` }],
  }));

  // Egg, Fighting, Toilet and Avocado are squarer compositions than the
  // full-body mascot — scaled to roughly the same visual footprint rather
  // than the same raw height, so none dwarfs the other companions.
  const squareSize = Math.min(width, size) * 1.1;
  const frameState = frameStateForMood(mood);

  let art: React.ReactNode;
  if (skin === 'egg' || skin === 'fighting' || skin === 'toilet' || skin === 'avocado') {
    const frames =
      skin === 'egg' ? EggFrames : skin === 'fighting' ? FightingFrames : skin === 'toilet' ? ToiletFrames : AvocadoFrames;
    const [FrameA, FrameB] = pickFrames(frameState, frames);
    art = (
      <CrossfadeFrames
        FrameA={FrameA}
        FrameB={FrameB}
        height={squareSize}
        aspectRatio={FRAME_ASPECT_RATIO[skin]}
      />
    );
  } else {
    art = <CapyMascotIcon width={width} height={size} />;
  }

  return (
    <View style={[styles.container, { width, height: size }]}>
      <Animated.View style={[animatedStyle, locked && styles.dimmed]}>{art}</Animated.View>

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
