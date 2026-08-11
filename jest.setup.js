// Jest setup file for React Native testing
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      name: 'capy-timer',
    },
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockRejectedValue(new Error('SQLite is not available in tests')),
}));

// Feedback is fire-and-forget decoration, so these model the "works fine"
// case and tests assert on the calls rather than on any audible result.
// src/feedback swallows every failure, so a throwing mock proves silence,
// not breakage — feedback.test.ts overrides these to check that.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    volume: 1,
    play: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

// react-native-purchases pulls in @revenuecat/purchases-js-hybrid-mappings,
// which ships untransformed ESM that Jest cannot parse — so importing it
// anywhere in a module graph breaks that whole test file. The store reaches
// it via src/purchases/entitlements, which puts it in nearly every graph.
//
// This models the real Jest/Expo Go state: the native module isn't linked,
// so `configure()` throws and everything downstream reports unavailable.
// purchases.test.ts overrides this file-locally (Jest scopes mocks per file)
// to drive the available paths.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => {
      throw new Error('native module unavailable');
    }),
    getOfferings: jest.fn().mockResolvedValue({ current: null }),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
}));

// Neither of these native modules exists in Expo Go, on either platform —
// that's the whole point of the guarded-require pattern in src/widgets/.
// Default mocks model the "present and working" case; bridge.test.ts
// overrides individual methods to simulate the Expo Go throw instead.
jest.mock('@bacons/apple-targets', () => {
  // A plain `class` has no `.mock.instances`/`.mock.calls` for tests to
  // inspect — wrapping it in jest.fn() is what makes `new ExtensionStorage()`
  // trackable, matching how the real class is constructed per App Group.
  const ExtensionStorage = jest.fn().mockImplementation(function (appGroup) {
    this.appGroup = appGroup;
    this.set = jest.fn();
    this.get = jest.fn();
    this.remove = jest.fn();
  });
  ExtensionStorage.reloadWidget = jest.fn();
  ExtensionStorage.reloadControls = jest.fn();
  return { ExtensionStorage };
});

jest.mock('react-native-android-widget', () => ({
  requestWidgetUpdate: jest.fn().mockResolvedValue(undefined),
  requestWidgetUpdateById: jest.fn().mockResolvedValue(undefined),
  registerWidgetTaskHandler: jest.fn(),
  FlexWidget: () => null,
  TextWidget: () => null,
  ImageWidget: () => null,
  SvgWidget: () => null,
  IconWidget: () => null,
  ListWidget: () => null,
  OverlapWidget: () => null,
}));

// Silence the warning about timers
global.console = {
  ...console,
  warn: jest.fn(),
};
