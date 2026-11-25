import { fileURLToPath } from "node:url";

import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [
      // Vendored as upstream wrote it, so the next re-vendor is a plain copy.
      "tools/oxlint/anti-slop/**",
      // Written by scripts/site-jellies/data.gen.ts.
      "site/jelly-data.js",
      // Hand-written pages that go out as they are. oxfmt's HTML printer adds whitespace between
      // elements, which renders as a gap between inline-block ones.
      "site/**/*.html",
      "store/**/*.html",
      // Written by Apple's Icon Composer.
      "assets/hopwatch.icon/**",
    ],
    sortPackageJson: {},
  },
  lint: {
    ignorePatterns: [
      // Calder's own TypeScript project, with a tsconfig package the workspace doesn't install.
      ".calder",
      // Vendored as upstream wrote it; upstream lints and tests it.
      "tools/oxlint/anti-slop",
      // Written by scripts/site-jellies/data.gen.ts.
      "site/jelly-data.js",
    ],
    plugins: ["eslint", "oxc", "react", "typescript", "unicorn"],
    jsPlugins: [
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
      { name: "anti-slop-effect", specifier: "./tools/oxlint/anti-slop/effect/index.ts" },
    ],
    categories: {
      correctness: "error",
      perf: "error",
      suspicious: "error",
    },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",

      "eslint/eqeqeq": "error",
      "react/rules-of-hooks": "error",
      "typescript/consistent-type-imports": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-non-null-assertion": "error",
      "unicorn/prefer-node-protocol": "error",

      "oxc/no-accumulating-spread": "error",
      "anti-slop/no-array-filter-map": "error",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reduce-accumulator-copy": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-readable-spacing": "error",

      // `typescript/no-unsafe-type-assertion` already rejects narrowing casts, so a comment on a
      // safe upcast adds friction without safety. 81 findings.
      // https://github.com/dmmulroy/anti-slop/blob/63dbb09/src/rules/require-safety-comment-for-type-assertion.ts
      "anti-slop/require-safety-comment-for-type-assertion": "off",

      // Reusing a precise name in a nested callback reads better, and TypeScript resolves the
      // scopes. 23 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-shadow.html
      "eslint/no-shadow": "off",

      // Sequential awaits are deliberate: App Store uploads and their polling run in order, and the
      // on-device model answers one request at a time. 6 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-await-in-loop.html
      "eslint/no-await-in-loop": "off",

      // It asks a function that returns a value on one path to return one on all, which React's
      // effect callbacks and the site's event handlers don't; `noImplicitReturns` covers missing
      // returns. 29 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/typescript/consistent-return.html
      "typescript/consistent-return": "off",

      // Small immutable updates read better as spreads than as mutation. 4 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/oxc/no-map-spread.html
      "oxc/no-map-spread": "off",

      // A small helper beside its only caller reads better than one hoisted for a tiny allocation.
      // 44 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/unicorn/consistent-function-scoping.html
      "unicorn/consistent-function-scoping": "off",

      // Both push toward `toSorted` and `toReversed`, which Hermes lacks. 27 and 1 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/unicorn/no-array-sort.html
      "unicorn/no-array-sort": "off",
      // https://oxc.rs/docs/guide/usage/linter/rules/unicorn/no-array-reverse.html
      "unicorn/no-array-reverse": "off",

      // src/core checks what it reads by hand: the backup import, saved JSON, SQLite rows, Slack's
      // answers and the widgets' commands go through `typeof` checks and `Record<string, unknown>`,
      // and IDs get their brand by a cast (`randomUUID() as EntryId`). Decoding them with schemas
      // that mint the brands is a rewrite of those boundaries. 76 findings (67 in src/core), 55,
      // 15 and 10 findings. The `unknown` parameters also include `.catch` callbacks, whose reason
      // would otherwise be `any`.
      // https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-unsafe-type-assertion.html
      "typescript/no-unsafe-type-assertion": "off",
      // https://github.com/dmmulroy/anti-slop/blob/63dbb09/src/rules/no-runtime-typeof.ts
      "anti-slop/no-runtime-typeof": "off",
      // https://github.com/dmmulroy/anti-slop/blob/63dbb09/src/rules/no-unknown-parameters.ts
      "anti-slop/no-unknown-parameters": "off",
      // https://github.com/dmmulroy/anti-slop/blob/63dbb09/src/rules/no-unsafe-dictionary-type.ts
      "anti-slop/no-unsafe-dictionary-type": "off",

      // React Compiler memoizes these values (`experiments.reactCompiler` in app.json). 1 finding.
      // https://oxc.rs/docs/guide/usage/linter/rules/react/no-object-type-as-default-prop.html
      "react/no-object-type-as-default-prop": "off",

      // Some effects run on purpose only when one value changes, not on every value they read:
      // resetting a drag when `seg.start` moves (Timeline.tsx), starting a flight on `flight.key`
      // and `go` (Flyer.tsx), saving a jelly's name when its editor closes (editor.tsx). Both
      // rules report them, 4 and 3 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/react/exhaustive-effect-dependencies.html
      "react/exhaustive-effect-dependencies": "off",
      // https://oxc.rs/docs/guide/usage/linter/rules/react/exhaustive-deps.html
      "react/exhaustive-deps": "off",

      // Gesture Handler and Skia build with capitalized factories (`Gesture.Pan()`,
      // `Skia.Matrix()`), which it takes for components called as functions. 5 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/react/capitalized-calls.html
      "react/capitalized-calls": "off",

      // Each finding is a fixed list whose position is its identity: a face's two eyes, a coat's
      // seeded spots, confetti, grid slots and swatch rows. 14 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/react/no-array-index-key.html
      "react/no-array-index-key": "off",

      // React Native styles are objects or arrays of them. 67 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/react/style-prop-object.html
      "react/style-prop-object": "off",

      // The automatic JSX runtime needs no React import. 1402 findings.
      // https://oxc.rs/docs/guide/usage/linter/rules/react/react-in-jsx-scope.html
      "react/react-in-jsx-scope": "off",
    },
    overrides: [
      {
        // The UI and the website draw: a shape there is the dial's beans, a jelly's mouth or a
        // SwiftUI and Material shape (`buttonBorderShape`, `shapes.circle()`). 43 findings.
        // https://github.com/dmmulroy/anti-slop/blob/63dbb09/src/rules/no-shape-in-symbol-names.ts
        files: ["src/jelly/**", "site/**"],
        rules: { "anti-slop/no-shape-in-symbol-names": "off" },
      },
      {
        // The Alchemy stack is the only Effect code. The app is plain TypeScript.
        files: ["alchemy.run.ts"],
        rules: {
          "anti-slop-effect/no-manual-effect-error-tag": "error",
          "anti-slop-effect/no-manual-tag-comparison": "error",
          "anti-slop-effect/no-manual-tagged-construction": "error",
          "anti-slop-effect/no-service-constructor-imports": "error",
          "anti-slop-effect/prefer-effect-match": "error",
        },
      },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "react-native": fileURLToPath(new URL("./src/test/react-native.ts", import.meta.url)),
    },
  },
  // Pure TypeScript only, no React Native runtime: the domain under src/core, the language
  // picking in src/i18n and the jelly characters' model logic (src/jelly/character/ask.ts,
  // topics.ts). The few React Native imports they reach (src/i18n/device.ts) get a stub.
  test: {
    include: [
      "src/core/**/*.test.ts",
      "src/i18n/**/*.test.ts",
      "src/jelly/character/**/*.test.ts",
    ],
  },
});
