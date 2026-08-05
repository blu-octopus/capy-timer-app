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

// Silence the warning about timers
global.console = {
  ...console,
  warn: jest.fn(),
};
