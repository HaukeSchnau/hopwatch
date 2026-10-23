import { Calder, Files, On, Secret, Step, Task, cmd } from "@calder-ci/core"
import { Pnpm, Project } from "@calder-ci/std"
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
 * The native app's runtime version on one platform: Expo's fingerprint (fingerprint.config.js).
 * The store builds interpolate it, so Calder keys them by it: a push whose runtime version was
 * built before reuses that build and ships as an over-the-air update alone.
 */
const runtimeVersion = (platform: "ios" | "android") =>
  Task.make(`runtime-${platform}`, {
    shell,
    setup: install,
    run: cmd`scripts/runtime-version.sh ${platform} .calder-runtime-version.json`,
    value: { path: ".calder-runtime-version.json", schema: Schema.String },
  })
const ios = runtimeVersion("ios")
const android = runtimeVersion("android")

/** Releases run on the Mac agent, in Hauke's GUI session, where Xcode, the signing keychain and hermesc work. */
const mac = { platform: "aarch64-darwin" } as const

const testflight = Task.make("testflight", {
  ...mac,
  after: checks,
  // With the runtime version in the command, these are all a build reads that it doesn't cover.
  inputs: Files.of("scripts/testflight.sh", "scripts/export-testflight.plist"),
  run: cmd`scripts/testflight.sh ${ios}`,
}).pipe(Step.timeout("90 minutes"))

const play = Task.make("play", {
  ...mac,
  after: checks,
  inputs: Files.of("scripts/play-internal.sh", "scripts/android-sdk.gradle"),
  run: cmd`scripts/play-internal.sh ${android}`,
  secrets: {
    UPLOAD_KEYSTORE: Secret.file("play-upload-keystore"),
    UPLOAD_KEYSTORE_PASSWORD: Secret.file("play-upload-password"),
  },
}).pipe(Step.timeout("90 minutes"))

const ota = Task.make("ota", {
  ...mac,
  after: checks,
  // A revert has to ship as well, though its files match an update published before.
  reuse: "never",
  run: cmd`scripts/ota.sh ${ios} ${android}`,
  secrets: { EXPO_TOKEN_FILE: Secret.file("expo-token") },
}).pipe(Step.timeout("30 minutes"))

/** Sends the newest store build to users once Apple or Google approves it. */
const store = (platform: "ios" | "android") =>
  Task.make(`store-${platform}`, { ...mac, run: cmd`scripts/store.sh ${platform}` }).pipe(Step.timeout("60 minutes"))

const release = (name: string) => ({ inputs: { release: Schema.Literal(name) } })

export default Calder.project({
  rules: [
    ...website.rules,
    // Every push to main that passes the checks: the JavaScript over the air to installed builds
    // with the same runtime version, and new TestFlight and Play internal builds where it changed.
    On.push("main", [testflight, play, ota]),
    // New store builds although the runtime version was built before, such as after a revert to it.
    On.manual(release("native"), [testflight, play]),
    On.manual(release("store"), [store("ios"), store("android")]),
  ],
})
