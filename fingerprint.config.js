// Expo's fingerprint of the native app: the runtime version an over-the-air update must match
// (runtimeVersion in app.json), and what decides in CI whether a commit needs new store builds
// (.calder/ci.ts). Two adjustments to what it hashes:
// - Build numbers stay out, since every store build stamps its own (app.config.ts). The version
//   stays in, so a new version is a new binary.
// - Native code that config plugins copy in, which only autolinked modules would bring in on
//   their own: the app's Swift (plugins/with-app-surfaces.js), the widget extension
//   (@bacons/apple-targets) and the icons only notifications use. Both platforms hash them, as
//   the config has no per-platform sources.
const { version } = require('./app.json').expo;

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  sourceSkips: ['ExpoConfigVersions', 'PackageJsonAndroidAndIosScriptsIfNotContainRun'],
  // Prebuild writes it from expo-target.config.js, which is hashed. It exists when a build hashes
  // the app but not in CI's checkout, so hashing it would give the binary another runtime version.
  ignorePaths: ['targets/*/Info.plist'],
  extraSources: [
    { type: 'contents', id: 'version', contents: version, reasons: ['version'] },
    { type: 'dir', filePath: 'native', reasons: ['configPluginFiles'] },
    { type: 'dir', filePath: 'targets', reasons: ['appleTargets'] },
    { type: 'dir', filePath: 'assets/images', reasons: ['nativeAssets'] },
  ],
};
