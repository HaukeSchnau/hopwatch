package expo.modules.systemsurfaces

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Takes a tap from the notification or the widget: queues its command (made when the
 * button was drawn) and wakes the app to replay it, without opening the app.
 */
class SurfaceReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val command = intent.getStringExtra(EXTRA)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
    Surfaces.append(context, command)
    val pending = goAsync()
    Headless.drain(context) { pending.finish() }
  }

  companion object {
    private const val ACTION = "dev.schnau.hopwatch.TAP"
    private const val EXTRA = "command"

    /** A button's tap: `command` is the JSON to queue. Each button needs its own `requestCode`. */
    fun tap(context: Context, requestCode: Int, command: String): PendingIntent =
      PendingIntent.getBroadcast(
        context,
        requestCode,
        Intent(context, SurfaceReceiver::class.java).setAction(ACTION).putExtra(EXTRA, command),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
  }
}
