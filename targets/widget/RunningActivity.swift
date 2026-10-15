// The running entry as a Live Activity: Lock Screen banner, Dynamic Island, and a small
// layout for Apple Watch and CarPlay, in Jelly's palette. Stop and Back act in place
// through App Intents. AppSurfaces starts, updates and ends it, from the app's snapshot
// or right after a tap.

import ActivityKit
import SwiftUI
import WidgetKit

struct RunningActivityWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: RunningActivityAttributes.self) { context in
      RunningBanner(state: context.state)
        .activityBackgroundTint(Color(pair: context.state.paint.bg))
    } dynamicIsland: { context in
      let state = context.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Gummy(jelly: state.jelly, size: 44).padding(.leading, 4).padding(.top, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          Titles(jelly: state.jelly, ink: .white, muted: Color(hex: "#A99BB8"), cut: .head).padding(.top, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          RunningTimer(since: state.since, size: 26).foregroundStyle(Color(hex: state.jelly.colors.light)).frame(width: 110, alignment: .trailing).padding(.trailing, 4).padding(.top, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          // The island is always black: the hue's light tone on a dark wash.
          RunningButtons(state: state, stop: .white, onStop: Color(hex: "#150F1D"), wash: Color(hex: "#2A2333"), accent: Color(hex: state.jelly.colors.light)).padding(.top, 6)
        }
      } compactLeading: {
        Gummy(jelly: state.jelly, size: 24)
      } compactTrailing: {
        // The compact island leaves about 56pt; bold 13pt fits h:mm:ss.
        RunningTimer(since: state.since, size: 13, weight: .bold).foregroundStyle(Color(hex: state.jelly.colors.light)).frame(width: 56, alignment: .trailing)
      } minimal: {
        Gummy(jelly: state.jelly, size: 22)
      }
    }
    .supplementalActivityFamilies([.small])
  }
}

struct RunningBanner: View {
  let state: RunningActivityAttributes.ContentState
  @Environment(\.activityFamily) private var family

  var body: some View {
    let paint = state.paint
    if family == .small {
      // Apple Watch's Smart Stack and CarPlay: the jelly and its name over a big timer.
      // No buttons: the watch opens a full-screen view on tap, and CarPlay disables them.
      VStack(alignment: .leading, spacing: 1) {
        HStack(spacing: 6) {
          Gummy(jelly: state.jelly, size: 20)
          Text(state.jelly.name).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Color(pair: paint.ink)).lineLimit(1).minimumScaleFactor(0.8)
        }
        RunningTimer(since: state.since, size: 26).foregroundStyle(Color(pair: state.jelly.colors.accent)).frame(maxWidth: .infinity, alignment: .leading)
      }
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      .background(Color(pair: paint.bg), in: ContainerRelativeShape())
    } else {
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 12) {
          Gummy(jelly: state.jelly, size: 46)
          Titles(jelly: state.jelly, ink: Color(pair: paint.ink), muted: Color(pair: paint.muted))
          RunningTimer(since: state.since, size: 30).foregroundStyle(Color(pair: state.jelly.colors.accent)).frame(minWidth: 117, maxWidth: .infinity, alignment: .trailing)
        }
        RunningButtons(state: state, stop: Color(pair: paint.stop), onStop: Color(pair: paint.onStop), wash: Color(pair: state.jelly.colors.wash), accent: Color(pair: state.jelly.colors.accent))
      }
      .padding(16)
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .background(Color(pair: paint.bg))
    }
  }
}

struct RunningButtons: View {
  let state: RunningActivityAttributes.ContentState
  let stop: Color
  let onStop: Color
  let wash: Color
  let accent: Color

  var body: some View {
    HStack(spacing: 8) {
      Pill(intent: StopIntent(), symbol: "stop.fill", label: state.stop, fill: stop, color: onStop)
      if let back = state.back {
        Pill(intent: BackIntent(), symbol: "arrow.uturn.backward", label: back, fill: wash, color: accent)
      }
    }
  }
}
