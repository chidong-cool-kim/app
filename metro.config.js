const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Hermes 비활성화
config.transformer.hermesCommand = '';
config.transformer.enableHermes = false;

// Bridgeless mode 비활성화
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
