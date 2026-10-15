// Siri, Spotlight and Shortcuts: Hopwatch's actions without setup. The jelly in "Start
// …" comes from the app's snapshot; AppSurfaces updates the list when jellies change.
// App-only, since there may be one provider per app.

import AppIntents

struct HopwatchShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: StartJellyIntent(),
      phrases: [
        "Start \(\.$jelly) in \(.applicationName)",
        "Switch to \(\.$jelly) in \(.applicationName)",
        "\(.applicationName) \(\.$jelly)",
      ],
      shortTitle: "Start a Jelly",
      systemImageName: "play.circle"
    )
    AppShortcut(
      intent: BackIntent(),
      phrases: [
        "Back to the previous jelly in \(.applicationName)",
        "Resume \(.applicationName)",
      ],
      shortTitle: "Back",
      systemImageName: "arrow.uturn.backward.circle"
    )
    AppShortcut(
      intent: StopIntent(),
      phrases: [
        "Stop \(.applicationName)",
        "Stop the timer in \(.applicationName)",
      ],
      shortTitle: "Stop",
      systemImageName: "stop.circle"
    )
  }

  static let shortcutTileColor: ShortcutTileColor = .pink
}
