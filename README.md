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
scripts/m1.sh sim      # Debug dev client for simulators, built on the M1
```

## Release

Releases build on the M1 from the head of `main`, started by hand in Kiln. Pushes to `main`
run the checks and deploy the website.

```sh
kiln trigger hopwatch --inputs '{"release":"testflight"}'  # iOS build to TestFlight
kiln trigger hopwatch --inputs '{"release":"play"}'        # Android build to Play internal testing
kiln trigger hopwatch --inputs '{"release":"ota"}'         # JS and assets to installed builds
```

## Website

`site/` is the website at https://hopwatch.schnau.dev, which the stores link for privacy and
support. `alchemy.run.ts` serves it from Cloudflare. Kiln deploys it on every push to `main`,
and each pull request gets a preview at `https://pr-<number>-hopwatch.hauke-911.workers.dev`
that closes with it. Open `site/index.html` in a browser to work on it locally.
