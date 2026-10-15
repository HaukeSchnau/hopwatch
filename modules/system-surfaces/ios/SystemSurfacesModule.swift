// The surfaces' files for JavaScript on iOS: the snapshot it writes and the taps it
// replays (src/core/remote.ts), in the app group next to the widget extension. The layout
// matches targets/widget/_shared/Surfaces.swift. What happens after a write (the Live
// Activity, widgets, controls) is the app's AppSurfaces, which this tells by notification:
// a pod can't see the app target's code. It also hands JavaScript's Slack sign-in to the
// Slack client (Slack.swift), which AppSurfaces drives.

import ExpoModulesCore

public class SystemSurfacesModule: Module {
  private static let appGroup = "group.dev.schnau.hopwatch"
  private static let snapshotChanged = Notification.Name("HopwatchSnapshotChanged")
  private static let commandsQueued = Notification.Name("HopwatchCommandsQueued")

  private var observer: NSObjectProtocol?

  private static var folder: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?.appendingPathComponent("surfaces", isDirectory: true)
  }

  private static var queue: URL? { folder?.appendingPathComponent("queue", isDirectory: true) }

  /// Queue files are "<seq>-<uuid>.json".
  private static func queued() -> [(seq: Int, url: URL)] {
    guard let queue, let files = try? FileManager.default.contentsOfDirectory(at: queue, includingPropertiesForKeys: nil) else { return [] }
    return files
      .compactMap { url in Int(url.lastPathComponent.split(separator: "-").first ?? "").map { (seq: $0, url: url) } }
      .sorted { $0.seq < $1.seq }
  }

  public func definition() -> ModuleDefinition {
    Name("SystemSurfaces")

    Events("onCommands")

    Function("writeSnapshot") { (json: String) in
      guard let folder = Self.folder else { return }
      try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
      try Data(json.utf8).write(to: folder.appendingPathComponent("snapshot.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
      NotificationCenter.default.post(name: Self.snapshotChanged, object: nil)
    }

    Function("readCommands") { () -> [String] in
      Self.queued().compactMap { try? String(contentsOf: $0.url, encoding: .utf8) }
    }

    Function("removeCommands") { (seqs: [Int]) in
      let done = Set(seqs)
      for file in Self.queued() where done.contains(file.seq) {
        try? FileManager.default.removeItem(at: file.url)
      }
    }

    AsyncFunction("slackConnect") { (json: String) in
      try await HopwatchSlack.shared.connect(json)
      // AppSurfaces syncs on a new snapshot; this is one as far as Slack is concerned.
      NotificationCenter.default.post(name: Self.snapshotChanged, object: nil)
    }

    AsyncFunction("slackDisconnect") {
      await HopwatchSlack.shared.disconnect()
    }

    Function("slackLink") { () -> [String: Any]? in
      HopwatchSlack.link().map { ["team": $0.team, "broken": $0.broken] }
    }

    OnStartObserving {
      self.observer = NotificationCenter.default.addObserver(forName: Self.commandsQueued, object: nil, queue: .main) { [weak self] _ in
        self?.sendEvent("onCommands")
      }
    }

    OnStopObserving {
      if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }
      self.observer = nil
    }
  }
}
