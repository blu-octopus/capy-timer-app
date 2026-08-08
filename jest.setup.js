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
