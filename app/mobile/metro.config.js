const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');
const outputsPath = path.join(repoRoot, 'amplify_outputs.json');

const config = getDefaultConfig(projectRoot);
const watchFolders = [repoRoot, projectRoot];
config.watchFolders = [...new Set(watchFolders)];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '../../../amplify_outputs.json') {
    return {
      type: 'sourceFile',
      filePath: outputsPath,
    };
  }
  if (moduleName === '../../../amplify/data/resource') {
    return {
      type: 'sourceFile',
      filePath: path.join(repoRoot, 'amplify/data/resource.ts'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
