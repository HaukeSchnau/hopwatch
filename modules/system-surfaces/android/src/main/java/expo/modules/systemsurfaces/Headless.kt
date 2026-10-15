package expo.modules.systemsurfaces

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.facebook.react.jstasks.HeadlessJsTaskEventListener
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Wakes the app's JavaScript to replay queued taps: the headless task "HopwatchSurfaces"
 * (index.ts) loads the store, replays, and brings the notification, nudge, shortcuts and
 * snapshot up to date. Works with the app closed, in the background or in front. `finish`
 * runs once, when the task ends or after DEADLINE_MS, whichever comes first, so a receiver
 * finishes its goAsync() before Android's 10 seconds run out even when JavaScript can't
 * start. The taps stay queued then, for the next launch.
 */
object Headless {
  private const val TASK = "HopwatchSurfaces"
  private const val DEADLINE_MS = 8_000L

  fun drain(context: Context, finish: () -> Unit) {
    val finished = AtomicBoolean(false)
    val done = { if (finished.compareAndSet(false, true)) finish() }
    Handler(Looper.getMainLooper()).postDelayed(done, DEADLINE_MS)
    val host = (context.applicationContext as? ReactApplication)?.reactHost ?: return done()
    val run = { reactContext: ReactContext ->
      UiThreadUtil.runOnUiThread {
        val tasks = HeadlessJsTaskContext.getInstance(reactContext)
        tasks.addTaskEventListener(object : HeadlessJsTaskEventListener {
          override fun onHeadlessJsTaskStart(taskId: Int) {}

          override fun onHeadlessJsTaskFinish(taskId: Int) {
            tasks.removeTaskEventListener(this)
            done()
          }
        })
        tasks.startTask(HeadlessJsTaskConfig(TASK, Arguments.createMap(), DEADLINE_MS, true))
      }
    }
    val current = host.currentReactContext
    if (current != null) {
      run(current)
    } else {
      host.addReactInstanceEventListener(object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          host.removeReactInstanceEventListener(this)
          run(context)
        }
      })
      host.start()
    }
  }
}
