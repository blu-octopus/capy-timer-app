module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // The react-native preset's asset transformer doesn't cover audio, so
    // these would reach Jest as raw bytes and fail to parse.
    '\\.(wav|mp3|m4a|aac|ogg)$': '<rootDir>/__mocks__/audioFileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@react-navigation|expo|@expo|react-native-reanimated|react-native-worklets|react-native-gesture-handler|react-native-svg|react-native-safe-area-context)/)',
  ],
};