# Stint Five

Five design directions of Stint, a personal time tracker for iOS where switching
context is one tap. All five share the same data and features; pick one in the Lab.

- Product spec: [docs/spec.md](docs/spec.md)
- Architecture and the contract for each direction: [docs/building-a-direction.md](docs/building-a-direction.md)
- Direction briefs: [docs/directions/](docs/directions/)

## Develop

```sh
npm install
npm test               # domain tests
npx tsc --noEmit
npx expo start --dev-client
scripts/m1.sh sim      # Debug dev client for simulators, built on the M1
```
