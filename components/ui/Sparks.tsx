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

/**
 * Deliberately asymmetric so the burst doesn't read as a mechanical
 * starburst: radii, sizes and delays are all uneven, and no two particles
 * sit on the same spoke.
 */
const PARTICLES: Particle[] = [
  { tx: 20, ty: -9, size: 3.6, delay: 0, color: colors.yellowPrimary },
  { tx: -21, ty: -11, size: 3, delay: 30, color: colors.brown },
  { tx: 22, ty: 10, size: 3.2, delay: 15, color: colors.capyNose },
  { tx: -18, ty: 14, size: 2.6, delay: 45, color: colors.brown },
  { tx: 3, ty: -22, size: 3, delay: 10, color: colors.yellowPrimary },
  { tx: -4, ty: 21, size: 2.6, delay: 35, color: colors.capyNose },
  { tx: 30, ty: -20, size: 2.4, delay: 55, color: colors.brown },
  { tx: -29, ty: 2, size: 3.4, delay: 20, color: colors.yellowPrimary },
  { tx: 12, ty: 24, size: 2.8, delay: 60, color: colors.brown },
  { tx: -13, ty: -26, size: 3.2, delay: 25, color: colors.capyNose },
  { tx: 27, ty: 22, size: 2.2, delay: 70, color: colors.yellowPrimary },
  { tx: -26, ty: -22, size: 2.4, delay: 50, color: colors.capyNose },
  { tx: 8, ty: -31, size: 2.6, delay: 80, color: colors.brown },
  { tx: -9, ty: 30, size: 3, delay: 65, color: colors.yellowPrimary },
];

const DURATION = 420;

function Spark({ tx, ty, size, delay, color, scale }: Particle & { scale: number }) {
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
      transform: [
        { translateX: tx * scale * p },
        { translateY: ty * scale * p },
        { scale: 0.3 + 0.7 * p },
      ],
    };
  });

  const dotSize = size * scale;

  return (
    <Animated.View
      style={[
        styles.spark,
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          marginLeft: -dotSize / 2,
          marginTop: -dotSize / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export interface SparksProps {
  /**
   * Multiplies both the spread and the dot size. The inline uses (a toggle
   * flipping, a checkbox ticking) want the burst to stay inside the control
   * at 1; finishing a session wants it to carry across the whole mascot.
   */
  scale?: number;
}

/**
 * One-shot particle burst. Remount (via a changing `key`) to replay it —
 * there is no imperative restart.
 */
export function Sparks({ scale = 1 }: SparksProps) {
  return (
    <View style={styles.container}>
      {PARTICLES.map((particle, i) => (
        <Spark key={i} {...particle} scale={scale} />
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
