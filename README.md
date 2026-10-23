# Hopwatch

A personal time tracker for iOS and Android where switching context is one tap. Every context is a
little jelly character; the one you're on lives in the middle of today's 24-hour dial.

- Product spec: [docs/spec.md](docs/spec.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Design: [docs/design/](docs/design/)

## Develop

`devenv shell` brings Node and pnpm.

```sh
pnpm install
pnpm test              # domain tests
pnpm typecheck
pnpm lint
pnpm start --dev-client
pnpm expo run:ios      # development build on a Mac with Xcode
pnpm expo run:android  # development build with the Android SDK
```

## Release

Every push to `main` that passes the checks releases itself from a Mac Calder agent: its
JavaScript and assets over the air to installed builds with the same native code, and new
TestFlight and Play internal testing builds when the native code changed (Expo's fingerprint,
`fingerprint.config.js`). It also deploys the website. See `docs/architecture.md`, Releasing.

```sh
calder trigger hopwatch --inputs '{"release":"store"}'   # newest builds to App Store review and Play production
calder trigger hopwatch --inputs '{"release":"native"}'  # new store builds although the native code was built before
```

## Website

`site/` is the website at https://hopwatch.schnau.dev, which the stores link for privacy and
support. `alchemy.run.ts` serves it from Cloudflare. Calder deploys it on every push to `main`,
and each pull request gets a preview at `https://pr-<number>-hopwatch.hauke-911.workers.dev`
that closes with it. `devenv up` serves it locally with `alchemy dev` on port 3000 (workerd,
production's headers, edits show up on reload); `project dev up` gives a checkout or workspace
its own instance and URL.

## License

[MIT](LICENSE), © Urbs UG (haftungsbeschränkt). The Nunito font in `assets/fonts` has its own
license ([OFL](assets/fonts/Nunito-OFL.txt)), and the store badges in `site/img/badges`
belong to Apple and Google.
