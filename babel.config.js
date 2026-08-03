module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo adds react-native-worklets/plugin automatically when the
  // package is installed; listing it again applies the transform twice.
  return {
    presets: ['babel-preset-expo'],
  };
};
