// The slice of React Native that pure modules touch, for the tests (see vite.config.ts).
// Tests run in English: no preferred languages, so src/i18n falls back to `en`.
export const Settings = {
  get: (_key: string): unknown => undefined,
};
