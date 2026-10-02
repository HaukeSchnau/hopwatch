import { I18nManager } from 'react-native';

/**
 * The app's language on Android, e.g. ["de_DE"]: the first locale of the app's
 * configuration when it started. That's the per-app language from Android 13 on, otherwise
 * the system's first language. Only the first: the whole list would need a native module.
 * A change while the app runs shows after its next start: Android keeps the process, and
 * only the activity, which JavaScript can't read without a native module, gets the new
 * locale.
 */
export function preferredLanguages(): string[] {
  const locale = I18nManager.getConstants().localeIdentifier;
  return locale ? [locale] : [];
}
