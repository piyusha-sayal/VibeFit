module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // unstable_transformImportMeta: on web Metro resolves zustand's ESM build,
      // which reads `import.meta.env`; without the polyfill the bundle fails to parse.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', unstable_transformImportMeta: true }],
      'nativewind/babel',
    ],
    plugins: [
      'react-native-worklets/plugin',
    ],
  };
};
