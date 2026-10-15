// Pieces every surface draws: colors from the app's snapshot, the candy gummy, the running
// timer, and the Stop and Back buttons that run App Intents in place.

import AppIntents
import SwiftUI
import UIKit
import WidgetKit

extension UIColor {
  convenience init(hex: String) {
    var value: UInt64 = 0
    Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))).scanHexInt64(&value)
    self.init(red: CGFloat((value >> 16) & 0xFF) / 255, green: CGFloat((value >> 8) & 0xFF) / 255, blue: CGFloat(value & 0xFF) / 255, alpha: 1)
  }
}

extension Color {
  init(hex: String) {
    self.init(uiColor: UIColor(hex: hex))
  }

  /// A [day, night] pair from the snapshot, resolved against the surface's appearance.
  init(pair: [String]) {
    let day = UIColor(hex: pair.first ?? "#000000")
    let night = UIColor(hex: pair.last ?? "#FFFFFF")
    self.init(uiColor: UIColor { $0.userInterfaceStyle == .dark ? night : day })
  }
}

/// A jelly bean in the jelly's hue with its emoji (or initial) and a glossy highlight.
struct Gummy: View {
  let jelly: Jelly
  let size: CGFloat

  var body: some View {
    ZStack {
      RoundedRectangle(cornerRadius: size * 0.38)
        .fill(LinearGradient(colors: [Color(hex: jelly.colors.light), Color(hex: jelly.colors.fill), Color(hex: jelly.colors.deep)], startPoint: .top, endPoint: .bottom))
      Capsule()
        .fill(.white.opacity(0.45))
        .frame(width: size * 0.36, height: size * 0.13)
        .offset(x: -size * 0.15, y: -size * 0.3)
      Text(jelly.mark)
        .font(.system(size: size * 0.5, weight: .bold, design: .rounded))
        .foregroundStyle(Color(hex: jelly.colors.on))
    }
    .frame(width: size, height: size)
  }
}

/// h:mm:ss counting up from `since`, ticked by the system without updates.
struct RunningTimer: View {
  let since: Date
  let size: CGFloat
  var weight: Font.Weight = .heavy

  var body: some View {
    Text(since, style: .timer)
      .font(.system(size: size, weight: weight, design: .rounded))
      .monospacedDigit()
      .multilineTextAlignment(.trailing)
  }
}

/// "Clients › Acme ›" over "Website".
struct Titles: View {
  let jelly: Jelly
  let ink: Color
  let muted: Color
  var cut: Text.TruncationMode = .tail

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      if !jelly.parents.isEmpty {
        Text("\(jelly.parents) ›").font(.system(size: 13, weight: .semibold, design: .rounded)).foregroundStyle(muted).lineLimit(1).truncationMode(cut)
      }
      Text(jelly.name).font(.system(size: 17, weight: .bold, design: .rounded)).foregroundStyle(ink).lineLimit(1)
    }
    .layoutPriority(1)
  }
}

/// A capsule button that runs an intent where it is, without opening the app.
struct Pill<I: AppIntent>: View {
  let intent: I
  let symbol: String
  let label: String
  let fill: Color
  let color: Color
  var size: CGFloat = 15

  var body: some View {
    Button(intent: intent) {
      HStack(spacing: 6) {
        Image(systemName: symbol).font(.system(size: size - 3, weight: .bold))
        Text(label).font(.system(size: size, weight: .bold, design: .rounded)).lineLimit(1)
      }
      .foregroundStyle(color)
      .padding(.horizontal, 14)
      .padding(.vertical, 8)
      .background(fill, in: Capsule())
    }
    .buttonStyle(.plain)
  }
}
