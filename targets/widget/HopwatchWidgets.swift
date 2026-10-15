// Everything the widget extension shows: the Live Activity, the Home and Lock Screen
// widget, and the Control Center controls.

import SwiftUI
import WidgetKit

@main
struct HopwatchWidgets: WidgetBundle {
  var body: some Widget {
    RunningActivityWidget()
    NowWidget()
    BackControl()
    StopControl()
    StartJellyControl()
  }
}
