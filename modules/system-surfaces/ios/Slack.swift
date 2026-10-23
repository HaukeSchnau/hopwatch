// Hopwatch's Slack client on iOS: keeps the person's Slack status in line with the running
// jelly. It runs in the app process without JavaScript, so a tap on the Live Activity, a
// widget or a control reaches Slack while JavaScript sleeps: AppSurfaces calls `sync`
// after every change and schedules a background refresh for the next look, JavaScript connects
// and disconnects through SystemSurfacesModule. The rules mirror src/core/slack.ts (`slackDue`,
// `slackPlan`, `appliedKey`, `slackExpiry`) and its tests; the sign-in itself happens in
// JavaScript (src/core/slack-link.ts), which hands over the tokens.

import Foundation
import Security

public actor HopwatchSlack {
  public static let shared = HopwatchSlack()

  /// A status as Slack takes it, with the jelly's emoji or "" (SlackWire in slack.ts).
  public struct Status: Equatable, Sendable {
    public let text: String
    public let emoji: String

    public init(text: String, emoji: String) {
      self.text = text
      self.emoji = emoji
    }
  }

  /// What Slack shows now (SlackShown in slack.ts).
  struct Shown {
    let text: String
    let emoji: String
    /// When it runs out (status_expiration), or nil for never.
    let until: Date?
  }

  /// When to look at Slack again without a switch.
  public enum Wake: Sendable {
    /// Nothing was decided (not connected, or nothing to do): leave any scheduled look.
    case keep
    /// No need to look until the next switch: cancel a scheduled look.
    case cancel
    case at(Date)
  }

  /// The sign-in (SlackGrant in slack.ts) and what this client last did (SlackMemory), in the Keychain.
  struct Link: Codable {
    var access: String
    var refresh: String
    /// Epoch milliseconds.
    var expiresAt: Double
    var team: String
    var teamId: String
    var userId: String
    var clientId: String
    /// Slack refused the tokens; only signing in again helps.
    var broken: Bool?
    /// The text of the status this client last set. Kept while another status covers it: a
    /// calendar app may put it back when its meeting ends.
    var ours: String?
    /// What Slack was last checked against (`appliedKey`).
    var applied: String?
    /// When Slack was last checked, epoch milliseconds.
    var checkedAt: Double?
  }

  enum Failure: Error {
    case signedOut
    case slack(String)
  }

  /// One call at a time: overlapping refreshes would spend the same rotating token twice.
  private var last: Task<Void, Never>?

  private func serially<T: Sendable>(_ work: @escaping @Sendable () async -> T) async -> T {
    let previous = last
    let task = Task { () -> T in
      await previous?.value
      return await work()
    }
    last = Task { _ = await task.value }
    return await task.value
  }

  /// The workspace this phone is connected to, for Settings.
  public static func link() -> (team: String, broken: Bool)? {
    load().map { ($0.team, $0.broken == true) }
  }

  /// Takes over a sign-in from JavaScript: SlackGrant plus `clientId`, as JSON.
  public func connect(_ json: String) async throws {
    let link = try JSONDecoder().decode(Link.self, from: Data(json.utf8))
    await serially { Self.save(link) }
  }

  /// Clears the status this client set, signs the tokens out and forgets them.
  public func disconnect() async {
    await serially {
      guard var link = Self.load() else { return }
      Self.save(nil)
      guard link.broken != true, (try? await Self.freshen(&link)) != nil else { return }
      if let ours = link.ours, let shown = try? await Self.shown(link), shown.text == ours {
        try? await Self.set(Status(text: "", emoji: ""), expiration: 0, link)
      }
      _ = try? await Self.call("auth.revoke", token: link.access)
    }
  }

  /// Brings Slack in line with `want`, the running jelly's status, or none, and says when to
  /// look again (`slackDue` and `slackPlan` in slack.ts). Another status (a meeting from a
  /// calendar app, one set by hand) wins; Hopwatch looks again when it runs out. `eager` (the
  /// app came to the front, a background refresh) looks after a minute even without a switch.
  public func sync(_ want: Status?, eager: Bool) async -> Wake {
    await serially { () -> Wake in
      guard var link = Self.load(), link.broken != true else { return .keep }
      let now = Date()
      let key = Self.appliedKey(want, now)
      guard Self.due(link, key: key, now: now, eager: eager) else { return .keep }
      do {
        if try await Self.freshen(&link) { Self.save(link) }
        let shown = try await Self.shown(link)
        let mine = link.ours != nil && shown.text == link.ours
        let empty = shown.text.isEmpty && shown.emoji.isEmpty
        let wake: Wake
        if !mine && !empty {
          // Keep `ours`: the calendar app may put Hopwatch's status back after the meeting.
          let pending = want != nil || link.ours != nil
          let end = shown.until.flatMap { $0 > now ? $0.addingTimeInterval(Self.afterOthers) : nil }
          wake = pending ? .at(end ?? now.addingTimeInterval(Self.recheck)) : .cancel
        } else if let want {
          let showing = mine && shown.text == want.text && link.applied == key
          if !showing { try await Self.set(want, expiration: Self.expiry(now), link) }
          link.ours = want.text
          wake = .at(now.addingTimeInterval(Self.recheck))
        } else {
          if mine { try await Self.set(Status(text: "", emoji: ""), expiration: 0, link) }
          link.ours = nil
          wake = .cancel
        }
        link.applied = key
        link.checkedAt = now.timeIntervalSince1970 * 1000
        Self.save(link)
        return wake
      } catch Failure.signedOut {
        link.broken = true
        Self.save(link)
        return .cancel
      } catch {
        // Offline or Slack hiccuped: try again in a while.
        return want == nil ? .keep : .at(now.addingTimeInterval(Self.recheck))
      }
    }
  }

  // MARK: - The rules (slack.ts)

  private static func dayKey(_ date: Date) -> String {
    let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
  }

  /// While there's a status to show, how often to look again without a switch.
  static let recheck: TimeInterval = 30 * 60
  /// A look on demand waits at least this long after the last one.
  static let eagerAfter: TimeInterval = 60
  /// How long after another status runs out to look, so a calendar app is done with it.
  static let afterOthers: TimeInterval = 2 * 60

  static func due(_ link: Link, key: String, now: Date, eager: Bool) -> Bool {
    if link.applied != key { return true }
    if key == appliedKey(nil, now) && link.ours == nil { return false }
    let checked = Date(timeIntervalSince1970: (link.checkedAt ?? 0) / 1000)
    return now.timeIntervalSince(checked) >= (eager ? eagerAfter : recheck)
  }

  static func appliedKey(_ want: Status?, _ now: Date) -> String {
    guard let want else { return "none" }
    return "\(want.text)|\(want.emoji)|\(dayKey(now))"
  }

  /// The next local midnight in epoch seconds: a status runs out on its own by then.
  static func expiry(_ now: Date) -> Int {
    let calendar = Calendar.current
    let midnight = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now)) ?? now.addingTimeInterval(86_400)
    return Int(midnight.timeIntervalSince1970)
  }

  // MARK: - Slack's Web API

  private static let signedOut: Set<String> = ["invalid_auth", "not_authed", "token_revoked", "token_expired", "invalid_refresh_token", "account_inactive", "missing_scope"]

  /// Refreshes the access token when it's about to run out. Tokens rotate, so the caller
  /// saves the link right away. True when it refreshed.
  private static func freshen(_ link: inout Link) async throws -> Bool {
    guard link.expiresAt - 60_000 < Date().timeIntervalSince1970 * 1000 else { return false }
    let answer = try await call("oauth.v2.access", form: ["client_id": link.clientId, "grant_type": "refresh_token", "refresh_token": link.refresh])
    let user = (answer["authed_user"] as? [String: Any]).flatMap { $0["access_token"] is String ? $0 : nil } ?? answer
    guard let access = user["access_token"] as? String, let refresh = user["refresh_token"] as? String else { throw Failure.slack("no_token") }
    link.access = access
    link.refresh = refresh
    link.expiresAt = Date().timeIntervalSince1970 * 1000 + ((user["expires_in"] as? Double) ?? 0) * 1000
    return true
  }

  private static func shown(_ link: Link) async throws -> Shown {
    let answer = try await call("users.profile.get", token: link.access)
    let profile = answer["profile"] as? [String: Any] ?? [:]
    let until = (profile["status_expiration"] as? NSNumber)?.doubleValue ?? 0
    return Shown(
      text: profile["status_text"] as? String ?? "",
      emoji: profile["status_emoji"] as? String ?? "",
      until: until > 0 ? Date(timeIntervalSince1970: until) : nil
    )
  }

  private static func set(_ status: Status, expiration: Int, _ link: Link) async throws {
    let profile: [String: Any] = ["status_text": status.text, "status_emoji": status.emoji, "status_expiration": expiration]
    do {
      _ = try await call("users.profile.set", token: link.access, json: ["profile": profile])
    } catch Failure.slack(let error) where error.hasSuffix("not_valid_emoji") && !status.emoji.isEmpty {
      // An emoji this workspace doesn't have: Slack's default instead.
      try await set(Status(text: status.text, emoji: ""), expiration: expiration, link)
    }
  }

  private static func call(_ method: String, token: String? = nil, form: [String: String]? = nil, json: [String: Any]? = nil) async throws -> [String: Any] {
    var request = URLRequest(url: URL(string: "https://slack.com/api/\(method)")!, timeoutInterval: 10)
    if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
    if let form {
      request.httpMethod = "POST"
      request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
      var allowed = CharacterSet.alphanumerics
      allowed.insert(charactersIn: "-._~")
      request.httpBody = form.map { "\($0.key)=\($0.value.addingPercentEncoding(withAllowedCharacters: allowed) ?? "")" }.joined(separator: "&").data(using: .utf8)
    } else if let json {
      request.httpMethod = "POST"
      request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONSerialization.data(withJSONObject: json)
    }
    let (data, _) = try await URLSession.shared.data(for: request)
    let answer = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    guard answer["ok"] as? Bool == true else {
      let error = answer["error"] as? String ?? "unreadable"
      throw signedOut.contains(error) ? Failure.signedOut : Failure.slack(error)
    }
    return answer
  }

  // MARK: - Keychain

  private static let item: [CFString: Any] = [
    kSecClass: kSecClassGenericPassword,
    kSecAttrService: "dev.schnau.hopwatch.slack",
    kSecAttrAccount: "link",
  ]

  private static func load() -> Link? {
    var query = item
    query[kSecReturnData] = true
    query[kSecMatchLimit] = kSecMatchLimitOne
    var data: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &data) == errSecSuccess, let data = data as? Data else { return nil }
    return try? JSONDecoder().decode(Link.self, from: data)
  }

  /// Readable after the first unlock, so Lock Screen taps can sync; never leaves this phone.
  private static func save(_ link: Link?) {
    SecItemDelete(item as CFDictionary)
    guard let link, let data = try? JSONEncoder().encode(link) else { return }
    var add = item
    add[kSecValueData] = data
    add[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    SecItemAdd(add as CFDictionary, nil)
  }
}
