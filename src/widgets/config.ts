/**
 * Shared between app.json's ios.entitlements, targets/widget/expo-target.config.js,
 * and this bridge. Must match in all three places or the widget reads an
 * empty UserDefaults suite.
 */
export const APP_GROUP = 'group.com.bluoctopus.capytimer.widgets';

export const ANDROID_WIDGET_NAMES = {
  battery: 'BatteryWidget',
  clock: 'ClockWidget',
} as const;

/** AsyncStorage key the Android task handler reads for the clock widget. */
export const ANDROID_SNAPSHOT_KEY = 'capy-timer-widget-snapshot';
