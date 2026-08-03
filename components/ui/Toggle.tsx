import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { USE_NATIVE_DRIVER } from '@/src/theme/animation';
import { colors, seeds } from '@/src/theme/tokens';
import { Sparks } from './Sparks';
import { WobbleBorder } from './WobbleBorder';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const TRACK_WIDTH = 47;
const TRACK_HEIGHT = 22;
const THUMB_SIZE = 20;
// 43px inner width - 20px thumb - 2px gap.
const THUMB_TRAVEL = 19;

export function Toggle({ value, onValueChange, disabled, accessibilityLabel }: ToggleProps) {
  // Sparks only replay on a fresh mount, so bump a key each time it turns on.
  const [burstKey, setBurstKey] = useState(0);
  const wasOn = useRef(value);

  useEffect(() => {
    if (value && !wasOn.current) setBurstKey((k) => k + 1);
    wasOn.current = value;
  }, [value]);

  const offset = useRef(new Animated.Value(value ? THUMB_TRAVEL : 0)).current;

  useEffect(() => {
    Animated.timing(offset, {
      toValue: value ? THUMB_TRAVEL : 0,
      duration: 200,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [value, offset]);

  const tint = value ? colors.brown : colors.greyPrimary;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={(44 - TRACK_HEIGHT) / 2}
      onPress={() => onValueChange(!value)}
      style={[styles.track, { borderColor: tint }, disabled && styles.disabled]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: value ? colors.white : colors.buttonSecondary },
          { transform: [{ translateX: offset }] },
        ]}
      >
        <WobbleBorder
          width={THUMB_SIZE}
          height={THUMB_SIZE}
          radius={THUMB_SIZE / 2}
          seed={seeds.toggleThumb}
          strokeWidth={2}
          color={tint}
        />
        {value && (
          <View style={StyleSheet.absoluteFill}>
            <Sparks key={burstKey} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 2,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
