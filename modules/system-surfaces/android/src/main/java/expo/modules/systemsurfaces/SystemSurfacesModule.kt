package expo.modules.systemsurfaces

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import androidx.core.graphics.toColorInt
import androidx.core.net.toUri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.roundToInt

private const val CHANNEL = "running"
private const val RUNNING_ID = 1

/**
 * Hopwatch's surfaces outside the app on Android: the running entry's ongoing notification
 * and the launcher's dynamic shortcuts. src/widgets/running-notification.ts and
 * src/widgets/shortcuts.ts keep them in step with the store. Every button and shortcut opens
 * a hopwatch:// link in the app, where src/app/+native-intent.tsx runs it, so nothing here
 * changes entries itself.
 */
class SystemSurfacesModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SystemSurfaces")

    // Posts or updates the notification. Resolves to false when the app may not post any.
    AsyncFunction("showRunning") { running: RunningNotification -> showRunning(running) }

    AsyncFunction("hideRunning") { NotificationManagerCompat.from(context).cancel(RUNNING_ID) }

    // Replaces the dynamic shortcuts. Launchers list them in this order.
    AsyncFunction("setShortcuts") { shortcuts: List<Shortcut> ->
      // Adaptive icons are 108 dp squares.
      val size = (108 * context.resources.displayMetrics.density).roundToInt()
      val infos = shortcuts.mapIndexed { rank, shortcut ->
        ShortcutInfoCompat.Builder(context, shortcut.id)
          .setShortLabel(shortcut.shortLabel)
          .setLongLabel(shortcut.longLabel)
          .setIcon(IconCompat.createWithAdaptiveBitmap(drawIcon(shortcut.icon, size, adaptive = true)))
          .setIntent(linkIntent(shortcut.url))
          .setRank(rank)
          .build()
      }
      ShortcutManagerCompat.setDynamicShortcuts(context, infos)
    }

    // Clears the link the activity was started with, once it has run. Otherwise a later
    // reload of the JavaScript (an OTA update applies one) would get it from
    // Linking.getInitialURL and run it again.
    Function("forgetLaunchLink") { appContext.currentActivity?.intent?.data = null }
  }

  // areNotificationsEnabled covers the POST_NOTIFICATIONS permission on Android 13 and later.
  @SuppressLint("MissingPermission")
  private fun showRunning(running: RunningNotification): Boolean {
    val manager = NotificationManagerCompat.from(context)
    // Low importance: in the shade and the status bar, without sound or a heads-up banner.
    // Created on every post, which also renames it after a language change.
    manager.createNotificationChannel(
      NotificationChannelCompat.Builder(CHANNEL, NotificationManagerCompat.IMPORTANCE_LOW)
        .setName(running.channelName)
        .setDescription(running.channelDescription)
        .setShowBadge(false)
        .build()
    )
    if (!manager.areNotificationsEnabled()) return false

    val largeIcon = context.resources.getDimensionPixelSize(android.R.dimen.notification_large_icon_width)
    val builder = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(smallIcon())
      .setLargeIcon(drawIcon(running.icon, largeIcon, adaptive = false))
      .setColor(running.icon.fill.toColorInt())
      .setContentTitle(running.title)
      .setContentText(running.text)
      // The system chronometer counts up from `when` on its own, so nothing posts per second.
      .setWhen(running.since.toLong())
      .setShowWhen(true)
      .setUsesChronometer(true)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setContentIntent(activity(0, launchIntent()))
    running.actions.forEachIndexed { index, action ->
      builder.addAction(0, action.label, activity(index + 1, linkIntent(action.url)))
    }
    manager.notify(RUNNING_ID, builder.build())
    return true
  }

  /** expo-notifications' icon from app.json, so this notification matches the nudges. */
  private fun smallIcon(): Int {
    @Suppress("DEPRECATION")
    val info = context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
    return info.metaData?.getInt("expo.modules.notifications.default_notification_icon")?.takeIf { it != 0 } ?: info.icon
  }

  /** Brings the app to the front as the launcher icon does. */
  private fun launchIntent(): Intent =
    checkNotNull(context.packageManager.getLaunchIntentForPackage(context.packageName)) { "No launcher activity" }

  /**
   * Opens `url` in a fresh start of the app's main activity, the way launchers start
   * shortcuts. Sent to the existing activity, a link gets lost after the process was killed:
   * Android restores the activity with its old intent and passes the link to onNewIntent
   * before React Native is ready, which drops it. A fresh start makes the link the
   * activity's own intent, where Linking.getInitialURL finds it either way.
   */
  private fun linkIntent(url: String): Intent =
    Intent(Intent.ACTION_VIEW, url.toUri())
      .setComponent(launchIntent().component)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)

  private fun activity(requestCode: Int, intent: Intent): PendingIntent =
    PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
}
