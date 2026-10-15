// The App Intents behind every button, control and Siri phrase: start a jelly, go back,
// stop. They're LiveActivityIntents, so the system runs perform() in the app's process,
// launching it in the background if needed, where AppSurfaces updates the Live Activity
// and the nudge right away. The widget extension compiles them too, for its buttons.

import ActivityKit
import AppIntents
import WidgetKit

/// A jelly for Shortcuts, Siri and the configurable control, from the app's snapshot.
struct JellyEntity: AppEntity {
  static let typeDisplayRepresentation: TypeDisplayRepresentation = "Jelly"
  static let defaultQuery = JellyQuery()

  let id: String
  let name: String
  let parents: String

  var displayRepresentation: DisplayRepresentation {
    parents.isEmpty ? DisplayRepresentation(title: "\(name)") : DisplayRepresentation(title: "\(name)", subtitle: "\(parents)")
  }

  init(_ jelly: Jelly) {
    id = jelly.id
    name = jelly.name
    parents = jelly.parents
  }
}

struct JellyQuery: EntityStringQuery {
  func entities(for identifiers: [String]) async throws -> [JellyEntity] {
    let jellies = Surfaces.snapshot()?.jellies ?? []
    return identifiers.compactMap { id in jellies.first { $0.id == id }.map(JellyEntity.init) }
  }

  func entities(matching string: String) async throws -> [JellyEntity] {
    (Surfaces.snapshot()?.jellies ?? []).filter { $0.name.localizedCaseInsensitiveContains(string) }.map(JellyEntity.init)
  }

  /// Pinned jellies first, in their slots' order.
  func suggestedEntities() async throws -> [JellyEntity] {
    guard let state = Surfaces.current() else { return [] }
    return (state.pinned + state.snapshot.jellies.filter { $0.pin == nil }).map(JellyEntity.init)
  }
}

/// What the app does after a tap: the Live Activity, the nudge, telling JavaScript.
@MainActor
protocol SurfacesRuntime: AnyObject {
  func tapped() async
}

@MainActor
enum SurfacesHost {
  /// Set at launch by the app (AppSurfaces); nil in the widget extension.
  static var runtime: (any SurfacesRuntime)?

  static func afterTap() async {
    if let runtime {
      await runtime.tapped()
    } else {
      WidgetCenter.shared.reloadAllTimelines()
      ControlCenter.shared.reloadAllControls()
    }
  }
}

/// A sentence from the app's strings, for Siri to say.
private func dialog(_ key: String, name: String = "") -> IntentDialog {
  IntentDialog(LocalizedStringResource(stringLiteral: Surfaces.snapshot()?.text(key, name: name) ?? name))
}

struct StartJellyIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Start a Jelly"
  static let description = IntentDescription("Switches Hopwatch to a jelly. Whatever runs stops at the same moment.")

  @Parameter(title: "Jelly")
  var jelly: JellyEntity

  init() {}

  init(jelly: JellyEntity) {
    self.jelly = jelly
  }

  static var parameterSummary: some ParameterSummary {
    Summary("Start \(\.$jelly)")
  }

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let started = try Taps.queue(.start(jelly.id))
    await SurfacesHost.afterTap()
    return .result(dialog: dialog("switched", name: started?.name ?? jelly.name))
  }
}

struct BackIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Back to the Previous Jelly"
  static let description = IntentDescription("Switches back to the jelly before the running one, or resumes the last one when nothing runs.")

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let started = try Taps.queue(.back)
    await SurfacesHost.afterTap()
    return .result(dialog: dialog("switched", name: started?.name ?? ""))
  }
}

struct StopIntent: LiveActivityIntent {
  static let title: LocalizedStringResource = "Stop the Timer"
  static let description = IntentDescription("Stops whatever Hopwatch is tracking.")

  @MainActor
  func perform() async throws -> some IntentResult & ProvidesDialog {
    let name = Surfaces.current()?.running?.jelly.name ?? ""
    try Taps.queue(.stop)
    await SurfacesHost.afterTap()
    return .result(dialog: dialog("stopped", name: name))
  }
}

/// The configurable control's settings: which jelly its button starts.
struct StartJellyControlConfiguration: ControlConfigurationIntent {
  static let title: LocalizedStringResource = "Start a Jelly"

  @Parameter(title: "Jelly")
  var jelly: JellyEntity?

  init() {}
}

/// The running entry's Live Activity. Everything it shows is in the content state, so a
/// tap can update it without the app's JavaScript.
struct RunningActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let entryId: String
    let jelly: Jelly
    let since: Date
    /// "Back to Dog", or nil when there's nowhere to go back to.
    let back: String?
    let stop: String
    let paint: Paint
  }
}
