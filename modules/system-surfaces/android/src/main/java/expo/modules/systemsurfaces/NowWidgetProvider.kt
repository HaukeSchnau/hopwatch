package expo.modules.systemsurfaces

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import kotlin.math.roundToInt

/**
 * The home screen widget: what runs, with Stop and Back, and four pinned jellies to switch
 * to. Every button queues a command made from the snapshot it was drawn with
 * (SurfaceReceiver); the app redraws the widget after each snapshot write (`refresh`).
 */
class NowWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val views = render(context)
    ids.forEach { manager.updateAppWidget(it, views) }
  }

  companion object {
    private val pins = listOf(R.id.hopwatch_pin_0, R.id.hopwatch_pin_1, R.id.hopwatch_pin_2, R.id.hopwatch_pin_3)
    private val pinLabels = listOf(R.id.hopwatch_pin_label_0, R.id.hopwatch_pin_label_1, R.id.hopwatch_pin_label_2, R.id.hopwatch_pin_label_3)
    private val pinSlots = listOf(R.id.hopwatch_pin_slot_0, R.id.hopwatch_pin_slot_1, R.id.hopwatch_pin_slot_2, R.id.hopwatch_pin_slot_3)

    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, NowWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val views = render(context)
      ids.forEach { manager.updateAppWidget(it, views) }
    }

    private fun render(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.hopwatch_now_widget)
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        views.setOnClickPendingIntent(R.id.hopwatch_widget_root, android.app.PendingIntent.getActivity(context, 0, launch, android.app.PendingIntent.FLAG_IMMUTABLE))
      }
      val snapshot = Surfaces.snapshot(context) ?: return views.apply { setTextViewText(R.id.hopwatch_running_name, context.getString(R.string.hopwatch_widget_setup)) }
      val iconSize = (40 * context.resources.displayMetrics.density).roundToInt()
      val running = snapshot.jelly(snapshot.running?.contextId)

      if (running != null && snapshot.running != null) {
        views.setImageViewBitmap(R.id.hopwatch_running_icon, drawIcon(running.icon, iconSize, adaptive = false))
        views.setViewVisibility(R.id.hopwatch_running_icon, View.VISIBLE)
        views.setTextViewText(R.id.hopwatch_running_name, running.name)
        val base = SystemClock.elapsedRealtime() - (System.currentTimeMillis() - snapshot.running.since)
        views.setChronometer(R.id.hopwatch_running_timer, base, null, true)
        views.setViewVisibility(R.id.hopwatch_running_timer, View.VISIBLE)
        views.setViewVisibility(R.id.hopwatch_stop, View.VISIBLE)
        views.setOnClickPendingIntent(R.id.hopwatch_stop, SurfaceReceiver.tap(context, 100, Surfaces.command(snapshot, null).toString()))
      } else {
        views.setViewVisibility(R.id.hopwatch_running_icon, View.GONE)
        views.setTextViewText(R.id.hopwatch_running_name, snapshot.text("nothing"))
        views.setChronometer(R.id.hopwatch_running_timer, SystemClock.elapsedRealtime(), null, false)
        views.setViewVisibility(R.id.hopwatch_running_timer, View.GONE)
        views.setViewVisibility(R.id.hopwatch_stop, View.GONE)
      }

      val back = snapshot.back
      if (back != null) {
        views.setTextViewText(R.id.hopwatch_back, snapshot.text(if (running != null) "back" else "resume", back.name))
        views.setViewVisibility(R.id.hopwatch_back, View.VISIBLE)
        views.setOnClickPendingIntent(R.id.hopwatch_back, SurfaceReceiver.tap(context, 101, Surfaces.command(snapshot, back.id).toString()))
      } else {
        views.setViewVisibility(R.id.hopwatch_back, View.GONE)
      }

      val pinned = snapshot.pinned
      pinSlots.forEachIndexed { i, slot ->
        val jelly = pinned.getOrNull(i)
        if (jelly == null) {
          views.setViewVisibility(slot, View.INVISIBLE)
          return@forEachIndexed
        }
        views.setViewVisibility(slot, View.VISIBLE)
        views.setImageViewBitmap(pins[i], drawIcon(jelly.icon, iconSize, adaptive = false))
        views.setTextViewText(pinLabels[i], jelly.name)
        views.setOnClickPendingIntent(slot, SurfaceReceiver.tap(context, 200 + i, Surfaces.command(snapshot, jelly.id).toString()))
      }
      return views
    }
  }
}
