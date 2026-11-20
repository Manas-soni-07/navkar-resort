// Expo SDK 52+ detects the pnpm monorepo automatically (watchFolders and
// nodeModulesPaths for the workspace root), so no manual overrides are needed.
// See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
