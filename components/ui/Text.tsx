import React from 'react';
import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fonts } from '@/src/theme/tokens';

export type TextVariant =
  | 'mainTimerNumber'
  | 'secondaryTimerNumber'
  | 'h1'
  | 'h2'
  | 'body'
  | 'bodyMedium'
  | 'bodySemiBold'
  | 'caption'
  | 'label'
  | 'stat';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
}

/**
 * Typography primitive. Note that capy-ui applies a live feTurbulence
 * filter to its display text for a hand-drawn edge; react-native-svg has
 * no equivalent for glyphs, so text renders clean here.
 */
export function Text({ variant = 'body', style, ...rest }: TextProps) {
  return <RNText style={[styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  mainTimerNumber: {
    fontFamily: fonts.display,
    fontSize: 48,
    color: colors.brown,
  },
  secondaryTimerNumber: {
    fontFamily: fonts.displayLight,
    fontSize: 20,
    color: colors.brown,
    textAlign: 'center',
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.brown,
  },
  h2: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.black,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.black,
  },
  bodyMedium: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.black,
  },
  bodySemiBold: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.black,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.grey,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stat: {
    fontFamily: fonts.body,
    fontSize: 24,
    color: colors.black,
  },
});
