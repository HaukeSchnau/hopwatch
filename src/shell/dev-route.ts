import { Settings } from 'react-native';

/**
 * Development only: `simctl launch … -stintRoute /day` opens that route on launch.
 * Launch arguments land in NSUserDefaults, which RN's Settings reads. Simulator deep
 * links would otherwise stop at iOS's "Open in …?" prompt (see scripts/sim.sh).
 */
export function devLaunchRoute(): string | null {
  if (!__DEV__) return null;
  const route: unknown = Settings.get('stintRoute');
  return typeof route === 'string' && route.startsWith('/') ? route : null;
}
