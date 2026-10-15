// Hopwatch's Slack client on iOS: keeps the person's Slack status in line with the running
// jelly. It runs in the app process without JavaScript, so a tap on the Live Activity, a
// widget or a control reaches Slack while JavaScript sleeps: AppSurfaces calls `sync`
// after every change, JavaScript connects and disconnects through SystemSurfacesModule.
// The rules mirror src/core/slack.ts (`slackStep`, `appliedKey`, `slackExpiry`); the
// sign-in itself happens in JavaScript (src/core/slack-link.ts), which hands over the tokens.

import Foundation
import Security

public actor HopwatchSlack {
  public static let shared = HopwatchSlack()

  /// A status as Slack takes it, with an emoji name like ":dog:" (SlackWire in slack.ts).
  public struct Status: Equatable, Sendable {
    public let text: String
    public let emoji: String

    public init(text: String, emoji: String) {
      self.text = text
      self.emoji = emoji
    }
  }

  /// The sign-in (SlackGrant in slack.ts) and what this client last did, in the Keychain.
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
    /// The text of the status this client set, so it never touches one set by hand.
    var ours: String?
    /// What Slack was last brought in line with (`appliedKey`).
    var applied: String?
  }

  enum Failure: Error {
    case signedOut
    case slack(String)
  }

  /// One call at a time: overlapping refreshes would spend the same rotating token twice.
  private var last: Task<Void, Never>?

  private func serially(_ work: @escaping @Sendable () async -> Void) async {
    let previous = last
    let task = Task {
      await previous?.value
      await work()
    }
    last = task
    await task.value
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

  /// Brings Slack in line with `want`, the running jelly's status, or none. Does nothing
  /// when not connected or nothing changed since the last sync; after a failed call the
  /// next sync tries again.
  public func sync(_ want: Status?) async {
    await serially {
      guard var link = Self.load(), link.broken != true else { return }
      let now = Date()
      let key = Self.appliedKey(want, now)
      guard key != link.applied else { return }
      do {
        if try await Self.freshen(&link) { Self.save(link) }
        let shown = try await Self.shown(link)
        let mine = link.ours != nil && shown.text == link.ours
        let empty = shown.text.isEmpty && shown.emoji.isEmpty
        if mine || empty, let want {
          try await Self.set(want, expiration: Self.expiry(now), link)
          link.ours = want.text
        } else if mine {
          try await Self.set(Status(text: "", emoji: ""), expiration: 0, link)
          link.ours = nil
        } else {
          // Someone's own status, or nothing to clear.
          link.ours = nil
        }
        link.applied = key
        Self.save(link)
      } catch Failure.signedOut {
        link.broken = true
        Self.save(link)
      } catch {}
    }
  }

  // MARK: - The rules (slack.ts)

  private static func dayKey(_ date: Date) -> String {
    let parts = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
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

  private static func shown(_ link: Link) async throws -> Status {
    let answer = try await call("users.profile.get", token: link.access)
    let profile = answer["profile"] as? [String: Any] ?? [:]
    return Status(text: profile["status_text"] as? String ?? "", emoji: profile["status_emoji"] as? String ?? "")
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
