/**
 * ? Capybara Timer - Typography System
 * 
 * Defines consistent text styles throughout the app.
 * Based on Material Design and iOS Human Interface Guidelines.
 */

import { Platform } from 'react-native';

// Font families using Inter
const fonts = {
  // Inter font family - clean, modern, highly readable
  regular: 'Inter_18pt-Regular',
  medium: 'Inter_18pt-Medium',
  semiBold: 'Inter_18pt-SemiBold',
  bold: 'Inter_18pt-Bold',
  light: 'Inter_18pt-Light',
  
  // For timer display - monospace ensures numbers align properly
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

// Typography scale - consistent sizing throughout the app
export const Typography = {
  // Headers
  largeTitle: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  title1: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  title2: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  title3: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.38,
  },

  // Body text
  body: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  bodyEmphasized: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  callout: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.32,
  },

  // Small text
  subheadline: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  caption1: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  caption2: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.07,
  },

  // Timer specific styles
  timerDisplay: {
    fontFamily: fonts.mono,
    fontSize: 48,
    lineHeight: 58,
    letterSpacing: -1.0,
  },
  timerLarge: {
    fontFamily: fonts.mono,
    fontSize: 64,
    lineHeight: 76,
    letterSpacing: -2.0,
  },
  timerSmall: {
    fontFamily: fonts.mono,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: 0,
  },

  // Button text
  buttonLarge: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0,
  },
  buttonMedium: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
  },
  buttonSmall: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0,
  },
};

// Helper function to get typography style with color
export const getTypographyStyle = (
  style: keyof typeof Typography,
  color: string
) => ({
  ...Typography[style],
  color,
});
