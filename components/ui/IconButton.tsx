import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

export interface IconButtonProps {
  icon: React.ComponentType<SvgProps>;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const MIN_TOUCH_TARGET = 44;

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = 24,
  disabled,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={Math.max(0, (MIN_TOUCH_TARGET - size) / 2)}
      onPress={onPress}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed, style]}
    >
      <Icon width={size} height={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.5,
  },
});
