module.exports = function(api) {
  api.cache(true);
  return {
    env: {
      production: {
        plugins: ['babel-plugin-transform-remove-console'],
      },
    },
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
