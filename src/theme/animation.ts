import { Platform } from 'react-native';

/**
 * react-native-web silently no-ops Animated timings that request the native
 * driver, leaving values frozen at their initial state. Native still gets the
 * UI-thread driver for transform/opacity.
 */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
