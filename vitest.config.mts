import { defineConfig } from 'vitest/config';

// Pure TypeScript only, no React Native runtime: the domain under src/core and the jelly
// characters' model logic (src/jelly/character/ask.ts, topics.ts).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ['src/core/**/*.test.ts', 'src/jelly/character/**/*.test.ts'] },
});
