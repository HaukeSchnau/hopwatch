import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the config; this only lets release builds stamp a unique build number,
// which every TestFlight upload needs (scripts/m1.sh sets STINT_BUILD_NUMBER).
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Stint',
  slug: config.slug ?? 'stint',
  ios: { ...config.ios, buildNumber: process.env.STINT_BUILD_NUMBER ?? config.ios?.buildNumber },
});
