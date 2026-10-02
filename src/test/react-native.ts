// The slice of React Native that pure modules touch, for vitest (see vitest.config.mts).
// Tests run in English: no preferred languages, so src/i18n falls back to `en`.
export const Settings = {
  get: (_key: string): unknown => undefined,
};
