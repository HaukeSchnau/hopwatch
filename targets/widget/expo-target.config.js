// The widget extension: the running entry's Live Activity, Home and Lock Screen widgets,
// and Control Center controls. Swift in _shared/ is compiled into the app too: the
// snapshot and command queue both sides use, and the App Intents every button runs.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'HopwatchWidgets',
  displayName: 'Hopwatch',
  // The bundle id the expo-widgets target had, so provisioning and the app group carry over.
  bundleIdentifier: '.widgets',
  deploymentTarget: config.ios.deploymentTarget,
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
