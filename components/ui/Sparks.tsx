import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/src/theme/tokens';

interface Particle {
  tx: number;
  ty: number;
  size: number;
  delay: number;
  color: string;
}

/** Deliberately asymmetric so the burst doesn't read as a mechanical starburst. */
const PARTICLES: Particle[] = [
  { tx: 20, ty: -9, size: 3.6, delay: 0, color: colors.yellowPrimary },
  { tx: -21, ty: -11, size: 3, delay: 30, color: colors.brown },
  { tx: 22, ty: 10, size: 3.2, delay: 15, color: colors.capyNose },
  { tx: -18, ty: 14, size: 2.6, delay: 45, color: colors.brown },
  { tx: 3, ty: -22, size: 3, delay: 10, color: colors.yellowPrimary },
  { tx: -4, ty: 21, size: 2.6, delay: 35, color: colors.capyNose },
];

const DURATION = 420;

function Spark({ tx, ty, size, delay, color }: Particle) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      // Fade in over the first 30% of the burst, then out.
      opacity: p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7,
      transform: [{ translateX: tx * p }, { translateY: ty * p }, { scale: 0.3 + 0.7 * p }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * One-shot particle burst. Remount (via a changing `key`) to replay it —
 * there is no imperative restart.
 */
export function Sparks() {
  return (
    <View style={styles.container}>
      {PARTICLES.map((particle, i) => (
        <Spark key={i} {...particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  spark: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
});
