import React from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, seeds } from '@/src/theme/tokens';
import { Text } from './Text';
import { useMeasuredSize, WobbleBorder } from './WobbleBorder';

export type ButtonVariant = 'filled' | 'outlined' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
}

const VISUAL_HEIGHT = 28;
const MIN_TOUCH_TARGET = 44;
const RADIUS = 10;

/**
 * The visual box stays 28pt tall per the design while the pressable area
 * expands to the 44pt accessibility minimum (capy-ui does this on web with
 * an invisible ::after overlay).
 */
export function Button({ label, variant = 'filled', disabled, testID, ...rest }: ButtonProps) {
  const { size, onLayout } = useMeasuredSize();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={(MIN_TOUCH_TARGET - VISUAL_HEIGHT) / 2}
      style={({ pressed }) => [styles.pressable, (pressed || disabled) && styles.dimmed]}
      testID={testID}
      {...rest}
    >
      <View
        onLayout={onLayout}
        testID={testID ? `${testID}-box` : undefined}
        style={[styles.box, styles[variant]]}
      >
        {variant === 'outlined' && (
          <WobbleBorder
            width={size.width}
            height={size.height}
            radius={RADIUS}
            seed={seeds.buttonOutlined}
          />
        )}
        <Text variant="body" style={[styles.label, labelStyles[variant]]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // No alignSelf here: it would override the parent's alignItems and pin the
  // button to the start of its container.
  pressable: {},
  dimmed: {
    opacity: 0.5,
  },
  box: {
    height: VISUAL_HEIGHT,
    borderRadius: RADIUS,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: colors.buttonSecondary,
  },
  outlined: {
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
  },
  label: {
    textTransform: 'capitalize',
  },
});

const labelStyles = StyleSheet.create({
  filled: { color: colors.textSecondary },
  outlined: { color: colors.black },
  ghost: { color: colors.grey },
});
