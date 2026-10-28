import { Calder, On, Secret, Step, Task, cmd } from "@calder-ci/core"
import { Expo, Pnpm, Project } from "@calder-ci/std"
import { Schema } from "effect"
import { flake } from "./flake.ts"

const shell = flake.devShells.ci
const install = Pnpm.install({ shell })
const checks = (["typecheck", "test", "lint"] as const).map((script) =>
  Task.make(script, { shell, setup: install, run: cmd`pnpm ${script}` })
)

/** The website under site/ on Cloudflare (alchemy.run.ts): production on push, previews per pull request. */
const website = Project.alchemy({
  flake,
  stack: {
    shell,
    setup: install,
    env: "cloudflare",
    outputs: { name: "Hopwatch", schema: Schema.Struct({ url: Schema.String }) },
  },
  checks,
  previews: { url: (_pr, outputs) => outputs.url },
})

/**
 * The native app's runtime version on each platform: Expo's fingerprint (fingerprint.config.js).
 * The store builds are keyed by it, so a push whose runtime version was built before reuses that
 * build and ships as an over-the-air update alone.
 */
const ios = Expo.runtimeVersion("ios", { shell, setup: install })
const android = Expo.runtimeVersion("android", { shell, setup: install })

/** The Mac agent, in Hauke's GUI session, where Xcode and the signing keychain work. */
const mac = { platform: "aarch64-darwin" } as const

/** Exports on the tower, x86_64 Linux, where React Native's hermesc runs. */
const update = Expo.exportUpdate({
  shell,
  setup: Pnpm.install({ platform: "x86_64-linux", shell, name: "install-tower" }),
  after: checks,
}).pipe(Step.timeout("30 minutes"))

const ota = Expo.publishUpdate({
  shell,
  setup: install,
  update,
  channel: "production",
  token: "expo-token",
  runtimes: { ios, android },
}).pipe(Step.timeout("15 minutes"))

/** Urbs UG's App Store Connect key: the project's secret, and its identifiers. */
const appStoreConnect = { key: "app-store-connect", keyId: "85N8Y9CZC4", issuerId: "e4b59e5f-0f40-4b1b-996e-b7a01664676a" }

const testflight = Expo.testflight({
  runtime: ios,
  appId: "6818526671",
  appStoreConnect,
  after: checks,
}).pipe(Step.timeout("90 minutes"))

/** On the Mac until the tower has an Android SDK, a JDK and gplay. */
const play = Expo.playInternal({
  ...mac,
  runtime: android,
  keystore: "play-upload-keystore",
  password: "play-upload-password",
  serviceAccount: "play-service-account",
  after: checks,
}).pipe(Step.timeout("90 minutes"))

/** Sends the newest store build to users once Apple or Google approves it, each with its store's key. */
const store = (platform: "ios" | "android") =>
  Task.make(`store-${platform}`, {
    ...mac,
    run: cmd`scripts/store.sh ${platform}`,
    ...(platform === "ios"
      ? {
        env: { ASC_KEY_ID: appStoreConnect.keyId, ASC_ISSUER_ID: appStoreConnect.issuerId },
        secrets: { ASC_PRIVATE_KEY_PATH: Secret.file(appStoreConnect.key) },
      }
      : { secrets: { GPLAY_SERVICE_ACCOUNT_JSON: Secret.file("play-service-account") } }),
  }).pipe(Step.timeout("60 minutes"))

const release = (name: string) => ({ inputs: { release: Schema.Literal(name) } })

export default Calder.project({
  rules: [
    ...website.rules,
    // Every push to main that passes the checks: the JavaScript over the air to installed builds
    // with the same runtime version, and new TestFlight and Play internal builds where it changed.
    On.push("main", [ota, testflight, play]),
    // New store builds although the runtime version was built before, such as after a revert to it.
    On.manual(release("native"), [testflight, play]),
    On.manual(release("store"), [store("ios"), store("android")]),
    // The release path without shipping: both runtime versions and an exported update.
    On.manual(release("dry-run"), [ios, android, update]),
  ],
})
