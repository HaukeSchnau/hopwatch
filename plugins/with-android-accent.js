// Tints Android's AppCompat widgets with Hopwatch's pink instead of AppCompat's teal: alert
// dialog buttons, the text cursor and selection handles. Sets colorPrimary and colorAccent
// on the app theme, with a lighter pink at night (values-night).
//
//   ["./plugins/with-android-accent", { "day": "#D93A86", "night": "#FF8CC8" }]
//
// Expo's own primaryColor plugin writes the day color into colors.xml and the theme, so this
// sets `primaryColor` and adds the rest.

const { AndroidConfig, withAndroidColorsNight, withAndroidStyles } = require('expo/config-plugins');

module.exports = function withAndroidAccent(config, { day, night }) {
  config = { ...config, primaryColor: day };

  config = withAndroidColorsNight(config, (c) => {
    c.modResults = AndroidConfig.Colors.assignColorValue(c.modResults, { name: 'colorPrimary', value: night });
    return c;
  });

  return withAndroidStyles(config, (c) => {
    c.modResults = AndroidConfig.Styles.assignStylesValue(c.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'colorAccent',
      value: '@color/colorPrimary',
    });
    return c;
  });
};
