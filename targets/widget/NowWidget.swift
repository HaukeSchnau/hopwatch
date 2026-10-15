// The Home and Lock Screen widget. Small: what runs, with Stop and Back. Medium: that, and
// up to six pinned jellies to switch to with one tap. Lock Screen: the running jelly and
// its timer; a tap there opens the app. Buttons run App Intents in place. The app reloads
// the timeline whenever what it shows changes, so the timeline itself never asks again.

import AppIntents
import SwiftUI
import WidgetKit

struct NowEntry: TimelineEntry {
  let date: Date
  let state: Effective?
}

struct NowProvider: TimelineProvider {
  func placeholder(in context: Context) -> NowEntry { NowEntry(date: .now, state: nil) }

  func getSnapshot(in context: Context, completion: @escaping (NowEntry) -> Void) {
    completion(NowEntry(date: .now, state: Surfaces.current()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<NowEntry>) -> Void) {
    completion(Timeline(entries: [NowEntry(date: .now, state: Surfaces.current())], policy: .never))
  }
}

struct NowWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "HopwatchNow", provider: NowProvider()) { entry in
      NowView(state: entry.state)
        .containerBackground(for: .widget) { Color(pair: entry.state?.snapshot.paint.bg ?? ["#FFF4E8", "#150F1D"]) }
        .widgetURL(URL(string: "hopwatch://"))
    }
    .configurationDisplayName("Hopwatch")
    .description("What's running, with Stop and Back, and your pinned jellies.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular, .accessoryInline])
  }
}

struct NowView: View {
  let state: Effective?
  @Environment(\.widgetFamily) private var family

  var body: some View {
    if let state {
      switch family {
      case .systemMedium:
        HStack(alignment: .top, spacing: 14) {
          RunningCard(state: state).frame(maxWidth: .infinity, alignment: .leading)
          PinnedGrid(state: state)
        }
      case .accessoryRectangular:
        AccessoryRunning(state: state)
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          Text(state.running?.jelly.mark ?? "⏸").font(.system(size: 22, weight: .bold, design: .rounded))
        }
      case .accessoryInline:
        if let running = state.running {
          Text("\(running.jelly.mark) \(running.jelly.name) ") + Text(running.since, style: .timer)
        } else {
          Text(state.snapshot.text("nothing"))
        }
      default:
        RunningCard(state: state)
      }
    } else {
      Text("Open Hopwatch once to set it up.").font(.system(size: 13, weight: .semibold, design: .rounded))
    }
  }
}

/// What runs and the buttons for it: Stop and Back, or Resume when nothing runs.
struct RunningCard: View {
  let state: Effective

  var body: some View {
    let paint = state.snapshot.paint
    VStack(alignment: .leading, spacing: 6) {
      if let running = state.running {
        Gummy(jelly: running.jelly, size: 40)
        Text(running.jelly.name).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Color(pair: paint.ink)).lineLimit(1)
        RunningTimer(since: running.since, size: 20).foregroundStyle(Color(pair: running.jelly.colors.accent)).frame(maxWidth: .infinity, alignment: .leading)
        Spacer(minLength: 0)
        HStack(spacing: 6) {
          Button(intent: StopIntent()) { roundIcon("stop.fill", fill: Color(pair: paint.stop), color: Color(pair: paint.onStop)) }.buttonStyle(.plain)
          if let back = state.back {
            Button(intent: BackIntent()) { HStack(spacing: 4) { Image(systemName: "arrow.uturn.backward"); Text(back.mark) } .font(.system(size: 13, weight: .bold, design: .rounded)).foregroundStyle(Color(pair: back.colors.accent)).frame(height: 30).padding(.horizontal, 10).background(Color(pair: back.colors.wash), in: Capsule()) }.buttonStyle(.plain)
          }
        }
      } else {
        Text(state.snapshot.text("nothing")).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Color(pair: paint.muted))
        Spacer(minLength: 0)
        if let back = state.back {
          Button(intent: BackIntent()) {
            HStack(spacing: 8) {
              Gummy(jelly: back, size: 28)
              Text(state.snapshot.text("resume", name: back.name)).font(.system(size: 13, weight: .bold, design: .rounded)).foregroundStyle(Color(pair: back.colors.accent)).lineLimit(2)
            }
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  private func roundIcon(_ symbol: String, fill: Color, color: Color) -> some View {
    Image(systemName: symbol).font(.system(size: 12, weight: .bold)).foregroundStyle(color).frame(width: 30, height: 30).background(fill, in: Circle())
  }
}

/// Up to six pinned jellies, each a button that switches to it.
struct PinnedGrid: View {
  let state: Effective

  var body: some View {
    let jellies = Array(state.pinned.prefix(6))
    let rows = stride(from: 0, to: jellies.count, by: 3).map { Array(jellies[$0 ..< min($0 + 3, jellies.count)]) }
    VStack(spacing: 8) {
      ForEach(rows.indices, id: \.self) { row in
        HStack(spacing: 8) {
          ForEach(rows[row]) { jelly in
            Button(intent: StartJellyIntent(jelly: JellyEntity(jelly))) {
              VStack(spacing: 2) {
                Gummy(jelly: jelly, size: 34)
                  .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(pair: jelly.colors.accent), lineWidth: state.running?.jelly.id == jelly.id ? 2.5 : 0).padding(-3))
                Text(jelly.name).font(.system(size: 10, weight: .semibold, design: .rounded)).foregroundStyle(Color(pair: state.snapshot.paint.ink)).lineLimit(1)
              }
              .frame(width: 52)
            }
            .buttonStyle(.plain)
          }
        }
      }
    }
  }
}

struct AccessoryRunning: View {
  let state: Effective

  var body: some View {
    if let running = state.running {
      HStack(spacing: 6) {
        Text(running.jelly.mark).font(.system(size: 24))
        VStack(alignment: .leading, spacing: 0) {
          Text(running.jelly.name).font(.system(size: 15, weight: .bold, design: .rounded)).lineLimit(1)
          Text(running.since, style: .timer).font(.system(size: 15, weight: .semibold, design: .rounded)).monospacedDigit()
        }
      }
    } else {
      Text(state.snapshot.text("nothing")).font(.system(size: 15, weight: .semibold, design: .rounded))
    }
  }
}
