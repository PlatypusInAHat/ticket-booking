const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const ignoredFolders = [
  '.expo',
  '.gradle-project-cache',
  '.jdk',
  'android/.cxx',
  'android/app/build',
  'dist'
];

config.resolver.blockList = exclusionList(
  ignoredFolders.map((folder) => new RegExp(`${path.resolve(projectRoot, folder).replace(/[/\\]/g, '[/\\\\]')}.*`))
);

module.exports = config;
