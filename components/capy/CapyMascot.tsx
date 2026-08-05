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

import { CapyMascotIcon } from './icons/CapyMascotIcon';
import { LockedIcon } from './icons/LockedIcon';

/**
 * Mood is expressed through motion rather than separate artwork — capy-ui
 * ships a single static mascot, so idle/working/paused/celebrating are the
 * same drawing under different animations.
 */
export type CapyMood = 'idle' | 'working' | 'paused' | 'celebrating';

export interface CapyMascotProps {
  /** Rendered height; width follows the illustration's aspect ratio. */
  size?: number;
  mood?: CapyMood;
  locked?: boolean;
  lockPrice?: number;
}

const NATURAL_WIDTH = 110;
const NATURAL_HEIGHT = 206;
const LOCKED_OPACITY = 0.4;

export function CapyMascot({
  size = NATURAL_HEIGHT,
  mood = 'idle',
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
        <CapyMascotIcon width={width} height={size} />
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
