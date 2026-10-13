# Hopwatch

A personal time tracker for iOS where switching context is one tap. Every context is a
little jelly character; the one you're on lives in the middle of today's 24-hour dial.

- Product spec: [docs/spec.md](docs/spec.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Design: [docs/design/](docs/design/)

## Develop

```sh
npm install
npm test               # domain tests
npx tsc --noEmit
npx expo lint
npx expo start --dev-client
scripts/m1.sh sim      # Debug dev client for simulators, built on the M1
```

## Release

Releases build on the M1 from the head of `main`, started by hand in Kiln. Pushes to `main`
only deploy the website.

```sh
kiln trigger hopwatch --inputs '{"release":"testflight"}'  # iOS build to TestFlight
kiln trigger hopwatch --inputs '{"release":"play"}'        # Android build to Play internal testing
kiln trigger hopwatch --inputs '{"release":"ota"}'         # JS and assets to installed builds
```
