package expo.modules.systemsurfaces

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.graphics.Typeface
import androidx.core.graphics.createBitmap
import androidx.core.graphics.toColorInt

/**
 * A jelly as a square bitmap of `size` px, like the Live Activity's gummy: the candy
 * gradient, a glossy highlight, and the emoji or initial on top (a stop square without
 * one). The notification's large icon is a rounded bean. An adaptive shortcut icon fills
 * the square, since the launcher masks it, and keeps its content inside the middle 66 of
 * 108 dp, which every mask shows.
 */
internal fun drawIcon(icon: Icon, size: Int, adaptive: Boolean): Bitmap {
  val bitmap = createBitmap(size, size)
  val canvas = Canvas(bitmap)
  val s = size.toFloat()
  val center = s / 2
  val box = if (adaptive) s * 66 / 108 else s

  val candy = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    shader = LinearGradient(
      0f, 0f, 0f, s,
      intArrayOf(icon.light.toColorInt(), icon.fill.toColorInt(), icon.deep.toColorInt()),
      null,
      Shader.TileMode.CLAMP
    )
  }
  if (adaptive) canvas.drawRect(0f, 0f, s, s, candy) else canvas.drawRoundRect(0f, 0f, s, s, s * 0.38f, s * 0.38f, candy)

  val gloss = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(115, 255, 255, 255) }
  val glossX = center - box * 0.15f
  val glossY = center - box * 0.3f
  val glossW = box * 0.18f
  val glossH = box * 0.065f
  canvas.drawRoundRect(glossX - glossW, glossY - glossH, glossX + glossW, glossY + glossH, glossH, glossH, gloss)

  val ink = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = icon.on.toColorInt() }
  val mark = icon.mark
  if (mark == null) {
    val half = box * 0.19f
    canvas.drawRoundRect(center - half, center - half, center + half, center + half, half * 0.35f, half * 0.35f, ink)
  } else {
    ink.textSize = box * 0.5f
    ink.textAlign = Paint.Align.CENTER
    ink.typeface = Typeface.DEFAULT_BOLD
    val metrics = ink.fontMetrics
    canvas.drawText(mark, center, center - (metrics.ascent + metrics.descent) / 2, ink)
  }
  return bitmap
}
