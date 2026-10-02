import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Runs data.gen.ts (not a test) with the app's character code, Skia replaced by CanvasKit.
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^@shopify\/react-native-skia$/, replacement: here('./skia-shim.ts') },
      { find: /^react-native$/, replacement: here('../../src/test/react-native.ts') },
    ],
  },
  test: { include: ['scripts/site-jellies/*.gen.ts'], testTimeout: 120_000 },
});
