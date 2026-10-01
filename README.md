# Stint

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
scripts/m1.sh testflight
```
