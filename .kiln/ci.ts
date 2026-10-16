import { Kiln, On, Secret, Step, Task, cmd } from "@kiln/core"
import { Pnpm, Project } from "@kiln/std"
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
  stack: { shell, setup: install, env: "cloudflare" },
  checks,
  previews: { url: (pr) => `https://pr-${pr}-hopwatch.hauke-911.workers.dev` },
})

/**
 * The app releases build on the Apple builder (m1) in Hauke's GUI session, where Xcode and the
 * signing keychain work. Pushes only check the app and deploy the website; a person starts each
 * release with `kiln trigger hopwatch --inputs '{"release":"testflight"}'` ("play", "ota").
 */
const testflight = Task.make("testflight", {
  platform: "aarch64-darwin",
  run: cmd`scripts/testflight.sh`,
}).pipe(Step.timeout("90 minutes"))

const play = Task.make("play", {
  platform: "aarch64-darwin",
  run: cmd`scripts/play-internal.sh`,
  secrets: {
    UPLOAD_KEYSTORE: Secret.file("play-upload-keystore"),
    UPLOAD_KEYSTORE_PASSWORD: Secret.file("play-upload-password"),
  },
}).pipe(Step.timeout("90 minutes"))

const ota = Task.make("ota", {
  platform: "aarch64-darwin",
  run: cmd`scripts/ota.sh`,
  secrets: { EXPO_TOKEN_FILE: Secret.file("expo-token") },
}).pipe(Step.timeout("30 minutes"))

const release = (name: string) => ({ inputs: { release: Schema.Literal(name) } })

export default Kiln.project({
  rules: [
    ...website.rules,
    On.manual(release("testflight"), [testflight]),
    On.manual(release("play"), [play]),
    On.manual(release("ota"), [ota]),
  ],
})
