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

// Silence the warning about timers
global.console = {
  ...console,
  warn: jest.fn(),
};
