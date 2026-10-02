// Stint speaks English and German. The language is fixed for a run of the app: iOS
// restarts an app when its language changes, so strings resolve once at startup.
//
// Each area keeps its strings in its own file in this folder as `localized({ en, de })`,
// with functions for anything that takes values ("Switched to Dog", plurals). German must
// have the same shape as English, so a missing translation fails the type check.
// Wording, tone and the glossary: docs/german.md.

import { preferredLanguages } from './device';

export const languages = ['en', 'de'] as const;
export type Language = (typeof languages)[number];

/** The first of the user's preferred languages Stint speaks, the way iOS matches them. */
export function pickLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const code = tag.toLowerCase().split(/[-_]/)[0];
    const match = languages.find((l) => l === code);
    if (match) return match;
  }
  return 'en';
}

export const language: Language = pickLanguage(preferredLanguages());

/** For Intl formatters: day-first dates and a 24-hour clock in both languages. */
export const locale = language === 'de' ? 'de-DE' : 'en-GB';

/** The strings for the app's language. */
export function localized<T>(strings: { en: T; de: NoInfer<T> }): T {
  return strings[language];
}
