package expo.modules.systemsurfaces

import android.content.ComponentName
import android.content.Context
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * The Quick Settings tile: "Back to Dog" while something runs, "Resume Dog" when nothing
 * does. A tap switches without opening the app. It reads the app's snapshot whenever Quick
 * Settings opens, again once a tap has been replayed, and when the app asks (`refresh`).
 */
class BackTileService : TileService() {
  override fun onStartListening() {
    show(Surfaces.snapshot(this))
  }

  override fun onClick() {
    val snapshot = Surfaces.snapshot(this) ?: return
    val target = snapshot.back ?: return
    Surfaces.append(this, Surfaces.command(snapshot, target.id))
    // Until the app has replayed the tap, show what it will do.
    qsTile?.apply {
      state = Tile.STATE_ACTIVE
      subtitle = target.name
      updateTile()
    }
    Headless.drain(this) { show(Surfaces.snapshot(this)) }
  }

  private fun show(snapshot: Snapshot?) {
    val tile = qsTile ?: return
    val running = snapshot?.jelly(snapshot.running?.contextId)
    val back = snapshot?.back
    tile.label = when {
      snapshot == null || back == null -> getString(R.string.hopwatch_tile_name)
      running != null -> snapshot.text("back", back.name)
      else -> snapshot.text("resume", back.name)
    }
    tile.subtitle = running?.name ?: snapshot?.text("nothing")
    tile.state = if (back == null) Tile.STATE_UNAVAILABLE else if (running != null) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
    tile.updateTile()
  }

  companion object {
    fun refresh(context: Context) {
      runCatching { requestListeningState(context, ComponentName(context, BackTileService::class.java)) }
    }
  }
}
