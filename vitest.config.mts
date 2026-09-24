import { defineConfig } from 'vitest/config';

// Domain tests only: pure TypeScript under src/core, no React Native runtime.
export default defineConfig({
  test: { include: ['src/core/**/*.test.ts'] },
});
