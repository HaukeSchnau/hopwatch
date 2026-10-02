package expo.modules.systemsurfaces

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// What JavaScript passes in; the matching types are in modules/system-surfaces/index.ts.

/** A jelly drawn as an icon by `drawIcon`. Colors are hex strings like "#FF6FB5". */
class Icon : Record {
  /** The emoji or initial. Null draws a stop square. */
  @Field val mark: String? = null

  /** The candy gradient from top to bottom. `fill` is also the notification's accent. */
  @Field val light: String = "#000000"
  @Field val fill: String = "#000000"
  @Field val deep: String = "#000000"

  /** The mark's color on the candy. */
  @Field val on: String = "#FFFFFF"
}

/** A button that opens a hopwatch:// link. */
class LinkAction : Record {
  @Field val label: String = ""
  @Field val url: String = ""
}

class RunningNotification : Record {
  /** The jelly with its parents, "Clients › Acme". */
  @Field val title: String = ""

  /** "Since 09:12". */
  @Field val text: String = ""

  /** The entry's start in epoch milliseconds. */
  @Field val since: Double = 0.0
  @Field val icon: Icon = Icon()
  @Field val actions: List<LinkAction> = emptyList()

  /** The notification channel's name and description in the app's language. */
  @Field val channelName: String = ""
  @Field val channelDescription: String = ""
}

class Shortcut : Record {
  /** Stable across updates, so a shortcut pinned to the home screen keeps up. */
  @Field val id: String = ""
  @Field val shortLabel: String = ""
  @Field val longLabel: String = ""
  @Field val url: String = ""
  @Field val icon: Icon = Icon()
}
