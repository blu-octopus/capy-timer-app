import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { EggCapy } from './EggCapy';
import { CapyMascotIcon } from './icons/CapyMascotIcon';
import { LockedIcon } from './icons/LockedIcon';

/**
 * Mood is expressed through motion rather than separate artwork — capy-ui
 * ships a single static mascot, so idle/working/paused/celebrating are the
 * same drawing under different animations.
 */
export type CapyMood = 'idle' | 'working' | 'paused' | 'celebrating';

/**
 * Which companion's art to render. capy-ui only ships the default Capy;
 * 'fighting' and 'toilet' fall back to it until real art exists for them —
 * unlocking those still costs coins and marks them owned, they just don't
 * look different yet. 'egg' is the one hand-authored variant proving the
 * unlock flow actually changes what you see.
 */
export type CapySkin = 'basic' | 'egg' | 'fighting' | 'toilet';

const SKINS: readonly CapySkin[] = ['basic', 'egg', 'fighting', 'toilet'];

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

  return (
    <View style={[styles.container, { width, height: size }]}>
      <Animated.View style={[animatedStyle, locked && styles.dimmed]}>
        {skin === 'egg' ? (
          // Egg Capy is a squarer composition than the full-body mascot —
          // scaled to roughly the same visual footprint rather than the
          // same raw height, so it doesn't dwarf the other companions.
          <EggCapy size={Math.min(width, size) * 1.1} />
        ) : (
          <CapyMascotIcon width={width} height={size} />
        )}
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
