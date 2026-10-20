// Where the app and its surfaces (Live Activity, widgets, controls, Siri) meet: files in
// the app group. The app writes the snapshot, what to show; a tap appends a command, what
// the app replays through its timeline the next time it runs (src/core/remote.ts). What
// a surface shows is the snapshot with those pending taps applied.
//
// Compiled into the app and the widget extension (apple-targets' _shared folder). The
// system-surfaces module reads and writes the same files from JavaScript's side.

import Foundation

enum Surfaces {
  static let appGroup = "group.dev.schnau.hopwatch"
  /// Closed entries shorter than this are dropped, like MIN_ENTRY_MS in model.ts.
  static let minEntry: TimeInterval = 30

  static var folder: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup)?
      .appendingPathComponent("surfaces", isDirectory: true)
  }

  private static var snapshotURL: URL? { folder?.appendingPathComponent("snapshot.json") }
  private static var queueFolder: URL? { folder?.appendingPathComponent("queue", isDirectory: true) }

  /// The app's last snapshot, or nil before the app first ran.
  static func snapshot() -> Snapshot? {
    guard let url = snapshotURL, let data = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
  }

  /// Taps the app hasn't replayed yet, oldest first.
  static func pending() -> [Command] {
    guard let folder = queueFolder,
          let files = try? FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
    else { return [] }
    return files
      .compactMap { url in (try? Data(contentsOf: url)).flatMap { try? JSONDecoder().decode(Command.self, from: $0) } }
      .sorted { $0.seq < $1.seq }
  }

  /// Queues a tap for the app. Files, not defaults, so no process reads a stale cache, and
  /// readable before first unlock is over so Lock Screen controls work.
  static func append(_ command: Command) throws {
    guard let folder = queueFolder else { throw SurfaceError.noAppGroup }
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let data = try JSONEncoder().encode(command)
    try data.write(to: folder.appendingPathComponent("\(command.seq)-\(UUID().uuidString).json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }

  /// What surfaces show now: the snapshot with pending taps applied.
  static func current() -> Effective? {
    guard let snapshot = snapshot() else { return nil }
    return Effective(snapshot: snapshot, pending: pending())
  }
}

enum SurfaceError: Error {
  case noAppGroup
}

// MARK: - The snapshot (written by src/widgets/surfaces.ts)

struct Snapshot: Codable {
  struct Running: Codable {
    let entryId: String
    let contextId: String
    /// Epoch milliseconds, as everywhere in the app.
    let since: Double
  }

  struct Recent: Codable {
    let id: String
    let contextId: String
    let start: Double
    let end: Double?
  }

  let version: Int
  let running: Running?
  let back: String?
  let recent: [Recent]
  let jellies: [Jelly]
  let paint: Paint
  let strings: [String: String]

  func jelly(_ id: String?) -> Jelly? { jellies.first { $0.id == id } }

  /// A string from the app, with `{name}` and `{duration}` filled in.
  func text(_ key: String, name: String = "", duration: String = "") -> String {
    (strings[key] ?? key).replacingOccurrences(of: "{name}", with: name).replacingOccurrences(of: "{duration}", with: duration)
  }
}

struct Jelly: Codable, Identifiable, Hashable {
  struct Colors: Codable, Hashable {
    let light: String
    let fill: String
    let deep: String
    let on: String
    /// [day, night]
    let accent: [String]
    let wash: [String]
  }

  let id: String
  let name: String
  /// "Clients › Acme" for Website; empty at the top level.
  let parents: String
  let mark: String
  let hue: String
  let colors: Colors
  let pin: Int?
  let nudgeMinutes: Double
  /// The Slack status while it runs, ready to send (`slack` in SnapshotJelly).
  let slack: Slack?

  struct Slack: Codable, Hashable {
    let text: String
    /// The jelly's emoji, which Slack names itself, or "" for Slack's default.
    let emoji: String
  }
}

struct Paint: Codable, Hashable {
  let bg: [String]
  let ink: [String]
  let muted: [String]
  let stop: [String]
  let onStop: [String]
}

// MARK: - Taps

/// A tap, as the app replays it (RemoteCommand in remote.ts).
struct Command: Codable {
  let seq: Int
  let kind: String
  let contextId: String?
  let entryId: String?
  let expectOpen: String?
  /// Epoch milliseconds.
  let at: Double
}

/// The state a surface shows: the snapshot with pending taps applied, by the same rules
/// the app's timeline will use when it replays them.
struct Effective {
  struct Running {
    let entryId: String
    let jelly: Jelly
    let since: Date
  }

  let snapshot: Snapshot
  let running: Running?
  /// Where "Back to" (while running) or "Resume" goes.
  let back: Jelly?

  init(snapshot: Snapshot, pending: [Command]) {
    self.snapshot = snapshot
    var recent = snapshot.recent.map { (id: $0.id, contextId: $0.contextId, start: $0.start, end: $0.end) }
    var open = snapshot.running.map { (entryId: $0.entryId, contextId: $0.contextId) }
    for command in pending where command.expectOpen == open?.entryId {
      // The running entry ends at the tap, or goes when that leaves it too short.
      if let index = recent.firstIndex(where: { $0.id == open?.entryId }) {
        if (command.at - recent[index].start) / 1000 < Surfaces.minEntry { recent.remove(at: index) } else { recent[index].end = command.at }
      }
      open = nil
      if command.kind == "start", let contextId = command.contextId, let entryId = command.entryId {
        recent.insert((id: entryId, contextId: contextId, start: command.at, end: nil), at: 0)
        open = (entryId: entryId, contextId: contextId)
      }
    }
    let openEntry = recent.first { $0.id == open?.entryId }
    if let open, let openEntry, let jelly = snapshot.jelly(open.contextId) {
      running = Running(entryId: open.entryId, jelly: jelly, since: Date(timeIntervalSince1970: openEntry.start / 1000))
    } else {
      running = nil
    }
    // previousContextId in timeline.ts: while running, the latest earlier entry of another
    // jelly; otherwise the latest entry's jelly.
    let target: String?
    if let openEntry {
      target = recent.first { $0.start < openEntry.start && $0.contextId != openEntry.contextId }?.contextId
    } else {
      target = recent.first?.contextId
    }
    back = snapshot.jelly(target)
  }

  /// The pinned jellies in their slots' order.
  var pinned: [Jelly] {
    snapshot.jellies.filter { $0.pin != nil }.sorted { ($0.pin ?? 0) < ($1.pin ?? 0) }
  }
}

/// What a button, a control or Siri asks for.
enum Tap {
  case start(String)
  case back
  case stop
}

enum Taps {
  /// Queues a tap against what surfaces show now and returns the jelly it started, if
  /// any. Throws when there's nothing to do: no snapshot yet, an unknown jelly, nothing
  /// running to stop, nowhere to go back to.
  @discardableResult
  static func queue(_ tap: Tap) throws -> Jelly? {
    guard let state = Surfaces.current() else { throw TapError.noSnapshot }
    let now = Date().timeIntervalSince1970 * 1000
    let seq = Int(now)
    let open = state.running?.entryId
    switch tap {
    case .stop:
      guard open != nil else { throw TapError.nothingRunning }
      try Surfaces.append(Command(seq: seq, kind: "stop", contextId: nil, entryId: nil, expectOpen: open, at: now))
      return nil
    case .start, .back:
      let target: Jelly?
      switch tap {
      case .start(let id): target = state.snapshot.jelly(id)
      default: target = state.back
      }
      guard let jelly = target else { throw TapError.unknownJelly }
      if state.running?.jelly.id == jelly.id { return jelly }
      try Surfaces.append(Command(seq: seq, kind: "start", contextId: jelly.id, entryId: UUID().uuidString.lowercased(), expectOpen: open, at: now))
      return jelly
    }
  }
}

enum TapError: Error, CustomLocalizedStringResourceConvertible {
  case noSnapshot, unknownJelly, nothingRunning

  var localizedStringResource: LocalizedStringResource {
    switch self {
    case .noSnapshot: "Open Hopwatch once first."
    case .unknownJelly: "That jelly isn't there anymore."
    case .nothingRunning: "Nothing is running."
    }
  }
}
