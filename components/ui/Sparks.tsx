import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '@/src/theme/animation';
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
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [delay, progress]);

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
          // Fade in over the first 30% of the burst, then out.
          opacity: progress.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 1, 0],
          }),
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          ],
        },
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
