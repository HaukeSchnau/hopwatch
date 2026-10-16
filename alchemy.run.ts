import * as Alchemy from 'alchemy';
import * as Cloudflare from 'alchemy/Cloudflare';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

const productionStage = 'prod';

const headers = `
/*
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
`;

// `alchemy dev` keeps its state in .alchemy/, so it needs no Cloudflare account.
const state = Layer.unwrap(
  Effect.gen(function* () {
    return (yield* Alchemy.ALCHEMY_DEV) ? Alchemy.localState() : Cloudflare.state();
  }).pipe(Effect.orDie),
);

/**
 * The website under site/, served by Cloudflare's asset layer without a script. Production answers
 * at hopwatch.schnau.dev, which the App Store and Google Play link for privacy and support. Any
 * other stage, such as pr-42, is a Worker Preview of production at
 * https://pr-42-hopwatch.hauke-911.workers.dev. `alchemy dev` serves it from workerd on HOST:PORT.
 */
export default Alchemy.Stack(
  'Hopwatch',
  { providers: Cloudflare.providers(), state },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const site = yield* Cloudflare.Worker('Site', {
      compatibility: { date: '2026-10-01' },
      assets: { directory: 'site', headers },
      ...((yield* Alchemy.ALCHEMY_DEV)
        ? {
            dev: {
              host: process.env.HOST ?? 'localhost',
              port: Number(process.env.PORT ?? 1337),
              strictPort: true,
            },
          }
        : stage === productionStage
          ? {
              name: 'hopwatch',
              workersDev: { enabled: false, previewsEnabled: true },
              domain: 'hopwatch.schnau.dev',
            }
          : { preview: { of: yield* Cloudflare.Worker.ref('Site', { stage: productionStage }) } }),
    });
    return { url: site.url };
  }),
);
