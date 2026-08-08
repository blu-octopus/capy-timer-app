module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|expo|@expo|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-svg|react-native-safe-area-context)/)',
  ],
};