import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/src/theme/tokens';
import { Sparks } from './Sparks';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Hand-drawn tick. The two strokes are ordered and reversed so the draw
 * reads as one continuous motion of the pen.
 */
const CHECK_PATH =
  'M1.0 5.39L1.08 5.45L2.0 5.5C2.4 5.75 2.36 6.29 2.53 6.48L3.22 6.71C3.39 6.9 3.59 7.05 3.81 7.16L4.5 7.5C4.73 7.61 4.95 7.74 5.16 7.87L5.61 8.62C5.82 8.75 6.02 8.91 6.2 9.09L6.73 9.63C6.9 9.81 7.03 9.93 7.09 9.98L7.2 10.05L7.32 10.13L7.4 10.19M7.01 10.45L7.07 10.37L7.12 10.4L7.17 10.38C7.21 10.36 7.31 10.26 7.48 10.08L7.98 9.52C8.15 9.34 8.3 9.14 8.43 8.92L8.83 8.27C8.96 8.06 9.1 7.86 9.26 7.66L9.74 7.09C9.9 6.89 10.08 6.71 10.26 6.54L10.83 6.03C11.01 5.87 11.18 5.68 11.32 5.47L11.75 4.85C11.9 4.65 12.03 4.43 12.15 4.21L12.51 3.54C12.64 3.32 12.8 3.12 12.99 2.96L13.59 2.48C13.79 2.32 14.02 2.04 14.28 1.66L14.68 1.08L14.74 1';

/**
 * Dash length used to reveal the stroke. Slightly over the real path length
 * so the tick is fully hidden at the start; `pathLength` normalisation is
 * not dependable across react-native-svg versions.
 */
const DASH_LENGTH = 34;
const DRAW_MS = 260;

const BOX_SIZE = 12;
const ICON_WIDTH = 13.74;
const ICON_HEIGHT = 14;

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  accessibilityLabel?: string;
}

export function Checkbox({ checked, onChange, accessibilityLabel }: CheckboxProps) {
  const [burstKey, setBurstKey] = useState(0);
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, {
      duration: DRAW_MS,
      easing: Easing.inOut(Easing.ease),
    });
    if (checked) setBurstKey((k) => k + 1);
  }, [checked, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: DASH_LENGTH * (1 - progress.value),
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={(44 - BOX_SIZE) / 2}
      onPress={() => onChange(!checked)}
      style={styles.box}
    >
      <Svg width={ICON_WIDTH} height={ICON_HEIGHT} viewBox="0 0 16 12">
        <AnimatedPath
          d={CHECK_PATH}
          stroke={colors.brown}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={DASH_LENGTH}
          animatedProps={animatedProps}
        />
      </Svg>
      {checked && (
        <View style={StyleSheet.absoluteFill}>
          <Sparks key={burstKey} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 1,
    borderColor: colors.grey,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
