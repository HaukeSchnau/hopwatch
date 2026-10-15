// Adds the app's side of the widgets, controls and Siri (native/ios/*.swift) to the app
// target and calls `AppSurfaces.install()` at launch. Those files use the Swift in
// targets/widget/_shared, which @bacons/apple-targets links into the app as well.
//
// It edits the AppDelegate that with-scene-lifecycle writes. Expo runs a later plugin's
// AppDelegate change first, so this one must come before with-scene-lifecycle in app.json.

const fs = require('fs');
const path = require('path');
const { IOSConfig, withAppDelegate, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const SOURCE = 'native/ios';
const ANCHOR = 'return super.application(application, didFinishLaunchingWithOptions: launchOptions)';

const swiftFiles = (projectRoot) =>
  fs.readdirSync(path.join(projectRoot, SOURCE)).filter((file) => file.endsWith('.swift'));

module.exports = function withAppSurfaces(config) {
  config = withAppDelegate(config, (c) => {
    const contents = c.modResults.contents;
    if (contents.includes('AppSurfaces.install()')) return c;
    if (!contents.includes(ANCHOR)) throw new Error('with-app-surfaces: no place in the AppDelegate to install AppSurfaces');
    c.modResults.contents = contents.replace(ANCHOR, `// Widgets, controls and Siri (native/ios/AppSurfaces.swift), on background launches too.\n    AppSurfaces.install()\n    ${ANCHOR}`);
    return c;
  });

  config = withDangerousMod(config, [
    'ios',
    (c) => {
      const name = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
      for (const file of swiftFiles(c.modRequest.projectRoot)) {
        fs.copyFileSync(path.join(c.modRequest.projectRoot, SOURCE, file), path.join(c.modRequest.platformProjectRoot, name, file));
      }
      return c;
    },
  ]);

  return withXcodeProject(config, (c) => {
    const name = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
    for (const file of swiftFiles(c.modRequest.projectRoot)) {
      const filepath = `${name}/${file}`;
      if (!c.modResults.hasFile(filepath)) IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: name, project: c.modResults });
    }
    return c;
  });
};
