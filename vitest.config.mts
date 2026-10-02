import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Pure TypeScript only, no React Native runtime: the domain under src/core, the language
// picking in src/i18n and the jelly characters' model logic (src/jelly/character/ask.ts,
// topics.ts). The few React Native imports they reach (src/i18n/device.ts) get a stub.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { 'react-native': fileURLToPath(new URL('./src/test/react-native.ts', import.meta.url)) },
  },
  test: { include: ['src/core/**/*.test.ts', 'src/i18n/**/*.test.ts', 'src/jelly/character/**/*.test.ts'] },
});
