// The app's side of the surfaces (targets/widget/_shared/Surfaces.swift). After a tap,
// whose intent runs in this process, and whenever JavaScript writes a new snapshot, it
// brings the Live Activity, the widgets, the controls and Siri's jelly list in line with
// what surfaces show, reschedules the nudge for the new entry, and sets the Slack status
// (modules/system-surfaces/ios/Slack.swift), looking at Slack again later from a background
// refresh, e.g. when a calendar app's meeting status ends. Installed at launch by the
// AppDelegate (plugins/with-app-surfaces.js), which runs for background launches too.

import ActivityKit
import AppIntents
import BackgroundTasks
internal import SystemSurfaces
import UIKit
import UserNotifications
import WidgetKit

@MainActor
final class AppSurfaces: SurfacesRuntime {
  static let shared = AppSurfaces()
  /// Posted by the system-surfaces module after JavaScript wrote a new snapshot.
  static let snapshotChanged = Notification.Name("HopwatchSnapshotChanged")
  /// Posted after a tap queued a command; the module asks JavaScript to replay it.
  static let commandsQueued = Notification.Name("HopwatchCommandsQueued")
  /// The nudge's notification id, shared with src/core/nudges.ts.
  static let nudgeId = "hopwatch.nudge"
  /// The background refresh that looks at Slack again (BGTaskSchedulerPermittedIdentifiers in app.json).
  static let slackRefresh = "dev.schnau.hopwatch.slack"

  /// What widgets and controls last showed, and the jellies Siri last knew.
  private var shown: String?
  private var jelliesKey: String?

  static func install() {
    SurfacesHost.runtime = shared
    NotificationCenter.default.addObserver(forName: snapshotChanged, object: nil, queue: .main) { _ in
      Task { @MainActor in await shared.refresh() }
    }
    // Another look at Slack: a meeting's status may have ended, or a call failed offline.
    NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { _ in
      Task { @MainActor in await shared.refresh(eagerSlack: true) }
    }
    // Must be registered before launching ends. iOS runs it some time after the date the last
    // sync asked for, as it sees fit.
    BGTaskScheduler.shared.register(forTaskWithIdentifier: slackRefresh, using: nil) { task in
      let work = Task { @MainActor in
        if let state = Surfaces.current() { await shared.syncSlack(state, eager: true) }
        task.setTaskCompleted(success: true)
      }
      task.expirationHandler = { work.cancel() }
    }
    Task { @MainActor in await endLegacyActivities() }
  }

  func tapped() async {
    await refresh()
    scheduleNudge()
    NotificationCenter.default.post(name: Self.commandsQueued, object: nil)
  }

  func refresh(eagerSlack: Bool = false) async {
    guard let state = Surfaces.current() else { return }
    await syncActivity(state)
    // Reload widgets and controls only when what they show changed: reloads from the
    // background count against a daily budget.
    let key = [state.running?.entryId, state.running?.jelly.name, state.back?.id, state.back?.name, state.pinned.map { "\($0.id)\($0.name)\($0.mark)\($0.hue)" }.joined()]
      .map { $0 ?? "-" }.joined(separator: "|")
    if key != shown {
      shown = key
      WidgetCenter.shared.reloadAllTimelines()
      ControlCenter.shared.reloadAllControls()
    }
    let jellies = state.snapshot.jellies.map { "\($0.id)\($0.name)" }.joined()
    if jellies != jelliesKey {
      jelliesKey = jellies
      HopwatchShortcuts.updateAppShortcutParameters()
    }
    let background = UIApplication.shared.beginBackgroundTask(withName: "Slack")
    Task {
      await syncSlack(state, eager: eagerSlack)
      UIApplication.shared.endBackgroundTask(background)
    }
  }

  /// The running jelly's Slack status, or none, then the next look as the sync asks. Callers
  /// give it background time, since after a tap the system may suspend the app as soon as
  /// the intent returns.
  private func syncSlack(_ state: Effective, eager: Bool) async {
    let want = state.running?.jelly.slack.map { HopwatchSlack.Status(text: $0.text, emoji: $0.emoji) }
    switch await HopwatchSlack.shared.sync(want, eager: eager) {
    case .keep:
      break
    case .cancel:
      BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.slackRefresh)
    case .at(let date):
      let request = BGAppRefreshTaskRequest(identifier: Self.slackRefresh)
      request.earliestBeginDate = date
      try? BGTaskScheduler.shared.submit(request)
    }
  }

  /// One activity while something runs, showing it; none otherwise.
  private func syncActivity(_ state: Effective) async {
    let activities = Activity<RunningActivityAttributes>.activities
    guard let running = state.running else {
      for activity in activities { await activity.end(nil, dismissalPolicy: .immediate) }
      return
    }
    let snapshot = state.snapshot
    let content = RunningActivityAttributes.ContentState(
      entryId: running.entryId,
      jelly: running.jelly,
      since: running.since,
      back: state.back.map { snapshot.text("back", name: $0.name) },
      stop: snapshot.text("stop"),
      paint: snapshot.paint
    )
    if let activity = activities.first {
      for extra in activities.dropFirst() { await extra.end(nil, dismissalPolicy: .immediate) }
      if activity.content.state != content { await activity.update(ActivityContent(state: content, staleDate: nil)) }
    } else if ActivityAuthorizationInfo().areActivitiesEnabled {
      // From the background this only works inside a LiveActivityIntent's perform().
      _ = try? Activity.request(attributes: RunningActivityAttributes(), content: ActivityContent(state: content, staleDate: nil))
    }
  }

  /// The forgotten-timer nudge for the entry a tap started, like nudges.ts schedules it.
  /// The app replaces it with its own once it replays the tap.
  private func scheduleNudge() {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [Self.nudgeId])
    guard let state = Surfaces.current(), let running = state.running else { return }
    let after = running.jelly.nudgeMinutes * 60
    let fireAt = running.since.addingTimeInterval(after)
    guard fireAt > .now else { return }
    let content = UNMutableNotificationContent()
    content.title = state.snapshot.text("nudgeTitle", name: running.jelly.name)
    content.body = state.snapshot.text("nudgeBody", duration: String(format: "%d:%02d", Int(after) / 3600, Int(after) % 3600 / 60))
    content.userInfo = ["kind": "nudge", "entryId": running.entryId]
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: fireAt.timeIntervalSinceNow, repeats: false)
    center.add(UNNotificationRequest(identifier: Self.nudgeId, content: content, trigger: trigger))
  }
}

/// expo-widgets' activity, which Hopwatch 1.1 started. Same name and shape, so ActivityKit
/// finds the ones still running after the update.
/// TODO: drop once 1.2.0 has been out a while; 1.1's activities end within hours anyway.
struct LiveActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var name: String
    var props: String
  }

  var url: String?
}

@MainActor
private func endLegacyActivities() async {
  for activity in Activity<LiveActivityAttributes>.activities {
    await activity.end(nil, dismissalPolicy: .immediate)
  }
}
