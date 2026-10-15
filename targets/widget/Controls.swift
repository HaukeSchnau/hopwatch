// Control Center controls, which also go on the Lock Screen and the Action Button: Back
// (or Resume), Stop, and Start a chosen jelly. Their labels come from the app's snapshot;
// the app reloads them whenever what they'd show changes.

import AppIntents
import SwiftUI
import WidgetKit

struct BackControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "dev.schnau.hopwatch.back") {
      let state = Surfaces.current()
      let label = state.flatMap { state in
        state.back.map { state.snapshot.text(state.running == nil ? "resume" : "back", name: $0.name) }
      }
      ControlWidgetButton(action: BackIntent()) {
        Label(label ?? String(localized: "Back"), systemImage: "arrow.uturn.backward")
      }
    }
    .displayName("Back to Previous")
    .description("Switches back to the jelly before, or resumes the last one.")
  }
}

struct StopControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: "dev.schnau.hopwatch.stop") {
      let state = Surfaces.current()
      ControlWidgetButton(action: StopIntent()) {
        Label(state?.running.map { state?.snapshot.text("stopName", name: $0.jelly.name) ?? $0.jelly.name } ?? String(localized: "Stop"), systemImage: "stop.fill")
      }
    }
    .displayName("Stop")
    .description("Stops whatever Hopwatch is tracking.")
  }
}

struct StartJellyControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    AppIntentControlConfiguration(kind: "dev.schnau.hopwatch.start", intent: StartJellyControlConfiguration.self) { configuration in
      let jelly = configuration.jelly
      ControlWidgetButton(action: StartJellyIntent(jelly: jelly ?? JellyEntity(id: "", name: "", parents: ""))) {
        Label(jelly?.name ?? String(localized: "Start a Jelly"), systemImage: "play.fill")
      }
    }
    .displayName("Start a Jelly")
    .description("Switches to the jelly you pick.")
    .promptsForUserConfiguration()
  }
}

extension JellyEntity {
  init(id: String, name: String, parents: String) {
    self.id = id
    self.name = name
    self.parents = parents
  }
}
