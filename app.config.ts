import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the config; this only lets release builds stamp a unique build number,
// which every TestFlight and Play upload needs. scripts/m1.sh sets HOPWATCH_BUILD_NUMBER to a
// UTC timestamp (YYYYMMDDHHMM): iOS uses it as is, Android as minutes since 1970.
const build = process.env.HOPWATCH_BUILD_NUMBER || undefined;

/** Google Play caps versionCode at 2100000000, which a 12-digit timestamp exceeds. */
function versionCode(stamp: string): number {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(stamp);
  if (!match) throw new Error(`HOPWATCH_BUILD_NUMBER should be YYYYMMDDHHMM in UTC, got "${stamp}"`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return Date.UTC(year, month - 1, day, hour, minute) / 60_000;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'Hopwatch',
  slug: config.slug ?? 'hopwatch',
  ios: { ...config.ios, buildNumber: build ?? config.ios?.buildNumber },
  android: { ...config.android, versionCode: build ? versionCode(build) : config.android?.versionCode },
});
