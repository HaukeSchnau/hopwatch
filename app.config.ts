import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the config; this only lets release builds stamp a unique build number, which
// every TestFlight and Play upload needs. Calder's store builds (@calder-ci/std/Expo) set
// IOS_BUILD_NUMBER to the UTC minute as YYYYMMDDHHMM and ANDROID_VERSION_CODE to minutes since 1970.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Hopwatch',
  slug: config.slug ?? 'hopwatch',
  ios: { ...config.ios, buildNumber: process.env.IOS_BUILD_NUMBER || config.ios?.buildNumber },
  android: {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE) || config.android?.versionCode,
  },
});
