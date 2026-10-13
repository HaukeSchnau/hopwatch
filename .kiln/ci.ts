import { Kiln, On, Secret, Step, Task, cmd } from "@kiln/core"
import { Project } from "@kiln/std"
import { Schema } from "effect"
import { flake } from "./flake.ts"

/**
 * The app releases build on the Apple builder (m1) in Hauke's GUI session, where Xcode and the
 * signing keychain work. Pushes only deploy the website; a person starts each release with
 * `kiln trigger hopwatch --inputs '{"release":"testflight"}'` ("play", "ota").
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
    ...Project.standard({ flake }).rules,
    On.manual(release("testflight"), [testflight]),
    On.manual(release("play"), [play]),
    On.manual(release("ota"), [ota]),
  ],
})
