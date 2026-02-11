const { withProjectBuildGradle } = require('@expo/config-plugins');

const MONOREPO_EXT = `
ext {
    REACT_NATIVE_NODE_MODULES_DIR = file("\${rootDir}/../../../node_modules/react-native").absolutePath
}
`;

function withMonorepoReactNative(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
      return config;
    }
    config.modResults.contents =
      MONOREPO_EXT.trim() + '\n\n' + config.modResults.contents;
    return config;
  });
}

module.exports = withMonorepoReactNative;
