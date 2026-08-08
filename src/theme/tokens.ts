/**
 * Cozy-UI design tokens, ported from capy-ui's tokens.css.
 * Single source of truth for color, typography, and stroke values.
 */

export const grey = {
  50: '#FAFAFA',
  100: '#F6F6F6',
  200: '#E7E7E7',
  300: '#D4D4D4',
  400: '#B3B3B3',
  500: '#8A8A8A',
  600: '#6B6B6B',
  700: '#4A4A4A', // first step clearing 4.5:1 AA vs white
  800: '#2E2E2E',
  900: '#1A1A1A', // clears 7:1 AAA
} as const;

export const colors = {
  brown: '#823D00',
  black: '#000000',
  white: '#FFFFFF',
  grey: grey[600],

  textSecondary: grey[700],
  borderDefault: grey[300],
  borderFocus: '#823D00',

  capyBody: '#FACC9E',
  capyNose: '#CF9171',

  buttonPrimary: grey[100],
  buttonSecondary: grey[200],

  redPrimary: '#DF7676',
  redSecondary: '#E99C9C',
  yellowPrimary: '#FFC519',
  yellowSecondary: '#FFE493',
  greenPrimary: '#72D16D',
  greenSecondary: '#ADE3AA',
  bluePrimary: '#6DB3D1',
  blueSecondary: '#94C6DC',
  greyPrimary: '#BEBEBE',
} as const;

/**
 * Font families. The display face is M PLUS Rounded 1c (capy-ui's
 * cross-platform stand-in for SF Pro Rounded), loaded via
 * @expo-google-fonts/m-plus-rounded-1c in the root layout.
 */
export const fonts = {
  display: 'MPLUSRounded1c_400Regular',
  displayLight: 'MPLUSRounded1c_300Light',
  displayBold: 'MPLUSRounded1c_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/**
 * Shared hand-drawn stroke language: same color, weight, and wobble
 * "hand feel" everywhere a generated outline appears. Each shape still
 * passes its own `seed` so the wobble pattern differs per component.
 */
export const stroke = {
  color: colors.brown,
  width: 1.5,
  frequency: 0.05,
  wiggle: 1,
  widthVariance: 0.5,
} as const;

/**
 * WobbleBorder seed registry — keeps each component's wobble pattern
 * distinct and stable across renders (matches capy-ui's assignments).
 */
export const seeds = {
  bubble: 4,
  modal: 5,
  trendCard: 6,
  pieChart: 7,
  barChart: 8,
  iapFeatured: 9,
  buttonOutlined: 10,
  toggleThumb: 11,
} as const;
