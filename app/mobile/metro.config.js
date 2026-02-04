const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [repoRoot];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '../../../amplify_outputs.json') {
    return {
      type: 'sourceFile',
      filePath: path.join(repoRoot, 'amplify_outputs.json'),
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
