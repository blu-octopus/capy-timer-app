import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import { playFeedback, type FeedbackKind } from '@/src/feedback';

export interface IconButtonProps {
  icon: React.ComponentType<SvgProps>;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Which press feedback to fire; 'none' opts out entirely. */
  feedback?: FeedbackKind | 'none';
}

const MIN_TOUCH_TARGET = 44;

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  size = 24,
  disabled,
  style,
  feedback = 'tap',
}: IconButtonProps) {
  // Every icon control in the app — including all the timer transport
  // buttons — routes through here, so this is the whole wiring for them.
  const handlePress = () => {
    if (feedback !== 'none') playFeedback(feedback);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={Math.max(0, (MIN_TOUCH_TARGET - size) / 2)}
      onPress={handlePress}
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
