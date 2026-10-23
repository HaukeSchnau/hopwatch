package expo.modules.systemsurfaces

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONObject

/**
 * Takes a tap from the notification or the widget: queues its command (made when the
 * button was drawn) and wakes the app to replay it, without opening the app. A wake the app
 * scheduled (`scheduleWake`) runs the same task with nothing to queue, so it can look at
 * Slack again after a meeting.
 */
class SurfaceReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != WAKE) {
      val command = intent.getStringExtra(EXTRA)?.let { runCatching { JSONObject(it) }.getOrNull() } ?: return
      Surfaces.append(context, command)
    }
    val pending = goAsync()
    Headless.drain(context) { pending.finish() }
  }

  companion object {
    private const val ACTION = "dev.schnau.hopwatch.TAP"
    private const val WAKE = "dev.schnau.hopwatch.WAKE"
    private const val WAKE_REQUEST = 900
    private const val EXTRA = "command"

    /** A button's tap: `command` is the JSON to queue. Each button needs its own `requestCode`. */
    fun tap(context: Context, requestCode: Int, command: String): PendingIntent =
      PendingIntent.getBroadcast(
        context,
        requestCode,
        Intent(context, SurfaceReceiver::class.java).setAction(ACTION).putExtra(EXTRA, command),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )

    /**
     * Wakes the app's headless task at `at` (epoch ms), or cancels the wake when null. Inexact,
     * so it needs no exact-alarm permission; Doze may hold it back a few minutes.
     */
    fun scheduleWake(context: Context, at: Long?) {
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      val wake = PendingIntent.getBroadcast(
        context,
        WAKE_REQUEST,
        Intent(context, SurfaceReceiver::class.java).setAction(WAKE),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
      )
      if (at == null) alarms.cancel(wake) else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, wake)
    }
  }
}
