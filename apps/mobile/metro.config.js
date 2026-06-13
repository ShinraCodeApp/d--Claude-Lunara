const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [monorepoRoot]

// disableHierarchicalLookup: Metro won't walk up from each file's directory.
// Instead it only checks nodeModulesPaths. This prevents duplicate-package
// errors (e.g. "registered two views with the same name RNCSafeAreaProvider")
// caused by react-native-safe-area-context, reanimated, and screens each
// existing in both apps/mobile/node_modules AND root node_modules.
// apps/mobile/node_modules is listed first so it wins for duplicated packages.
config.resolver.disableHierarchicalLookup = true

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
  // react-native ships its own nested packages (@react-native/*, react, scheduler…)
  // that are not hoisted. disableHierarchicalLookup can't find them without this.
  path.resolve(monorepoRoot, 'node_modules/react-native/node_modules'),
]

// resolveRequest runs before all other resolution (highest priority).
// Fixes HMR entry-point: Metro converts the app entry to
// "./node_modules/expo-router/entry" (relative) which fails when the package
// is hoisted to the root node_modules.
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './node_modules/expo-router/entry') {
    return {
      filePath: path.resolve(monorepoRoot, 'node_modules/expo-router/entry.js'),
      type: 'sourceFile',
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
