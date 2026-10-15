package expo.modules.systemsurfaces

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Where the app and its surfaces meet on Android: files in the app's own storage, the same
 * layout as iOS's app group (targets/widget/_shared/Surfaces.swift). JavaScript writes the
 * snapshot, what to show; a tap appends a command, which the app replays through its
 * timeline (src/core/remote.ts). Kotlin never changes entries itself.
 */
object Surfaces {
  private fun folder(context: Context) = File(context.filesDir, "surfaces")
  private fun queue(context: Context) = File(folder(context), "queue")

  fun writeSnapshot(context: Context, json: String) {
    val folder = folder(context).apply { mkdirs() }
    val temp = File(folder, "snapshot.json.tmp")
    temp.writeText(json)
    temp.renameTo(File(folder, "snapshot.json"))
  }

  fun snapshot(context: Context): Snapshot? =
    File(folder(context), "snapshot.json").takeIf { it.exists() }?.let { runCatching { Snapshot(JSONObject(it.readText())) }.getOrNull() }

  /** Queued taps, oldest first, as (seq, file). Files are "<seq>-<uuid>.json". */
  private fun queued(context: Context): List<Pair<Long, File>> =
    (queue(context).listFiles() ?: emptyArray())
      .mapNotNull { file -> file.name.substringBefore('-').toLongOrNull()?.let { it to file } }
      .sortedBy { it.first }

  fun readCommands(context: Context): List<String> = queued(context).mapNotNull { runCatching { it.second.readText() }.getOrNull() }

  fun removeCommands(context: Context, seqs: List<Long>) {
    val done = seqs.toSet()
    queued(context).filter { it.first in done }.forEach { it.second.delete() }
  }

  /** Queues a tap. Its `seq` is the tap's time, which orders taps from every surface. */
  fun append(context: Context, command: JSONObject) {
    val folder = queue(context).apply { mkdirs() }
    val seq = System.currentTimeMillis()
    command.put("seq", seq).put("at", seq)
    val temp = File(folder, ".${UUID.randomUUID()}")
    temp.writeText(command.toString())
    temp.renameTo(File(folder, "$seq-${UUID.randomUUID()}.json"))
  }

  /** A start of `contextId` against the snapshot, or a stop when `contextId` is null. */
  fun command(snapshot: Snapshot, contextId: String?): JSONObject =
    JSONObject()
      .put("kind", if (contextId == null) "stop" else "start")
      .put("contextId", contextId ?: JSONObject.NULL)
      .put("entryId", if (contextId == null) JSONObject.NULL else UUID.randomUUID().toString())
      .put("expectOpen", snapshot.running?.entryId ?: JSONObject.NULL)
}

/** The parts of the app's snapshot (Snapshot in src/core/remote.ts) Android draws. */
class Snapshot(json: JSONObject) {
  class Running(val entryId: String, val contextId: String, val since: Long)

  class Jelly(json: JSONObject) {
    val id: String = json.getString("id")
    val name: String = json.getString("name")
    val mark: String = json.getString("mark")
    val pin: Int? = if (json.isNull("pin")) null else json.getInt("pin")
    private val colors = json.getJSONObject("colors")
    val icon = Icon(mark, colors.getString("light"), colors.getString("fill"), colors.getString("deep"), colors.getString("on"))
  }

  val running: Running? = json.optJSONObject("running")?.let { Running(it.getString("entryId"), it.getString("contextId"), it.getLong("since")) }
  val jellies: List<Jelly> = json.getJSONArray("jellies").let { list -> (0 until list.length()).map { Jelly(list.getJSONObject(it)) } }
  val back: Jelly? = json.optString("back").takeIf { it.isNotEmpty() && !json.isNull("back") }?.let { id -> jellies.firstOrNull { it.id == id } }
  private val strings = json.getJSONObject("strings")

  fun jelly(id: String?): Jelly? = jellies.firstOrNull { it.id == id }

  val pinned: List<Jelly> get() = jellies.filter { it.pin != null }.sortedBy { it.pin }

  /** A string from the app, with `{name}` filled in. */
  fun text(key: String, name: String = ""): String = strings.optString(key, key).replace("{name}", name)
}
