import { Settings } from 'react-native';

/**
 * The user's preferred languages for this app, most preferred first, e.g. ["de-DE", "en"].
 * iOS keeps them in the app's defaults as AppleLanguages, with a per-app language from the
 * Settings app first, so no native module is needed. Launch arguments land there too:
 * `-AppleLanguages (de)` (see scripts/sim.sh).
 */
export function preferredLanguages(): string[] {
  const value: unknown = Settings.get('AppleLanguages');
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}
