# Jelly

**Squishy, bouncy, joyful.** Stint as a toy. Contexts are gummy candy blobs with tiny
faces: the running one is awake and bouncing, the others snooze. Everything squishes
when you touch it. It should make you smile every time you switch, and still be the
fastest way to switch.

## Visual language

- Light, sunny base (cream #FFF4E8 or soft pastel) with saturated candy hues. Dark mode
  optional ("night candy").
- Shapes: soft, chunky, rounded blobs with a glossy highlight, an inner shadow and a
  colored drop shadow, like gummy bears or clay. Skia paths and gradients work well;
  a gooey merge between blobs is a bonus.
- Type: Fredoka or Baloo 2 for display, Nunito for text. Big, rounded, friendly.
- Faces: two dot eyes and a small mouth. Sleeping blobs have closed eyes (arcs); the
  running blob blinks and looks around now and then. Keep them cute, not creepy, and
  small enough that the emoji and name stay readable.

## Structure

- A floating bubbly tab bar: **Now**, **Day**, **Week**, **Stuff** (contexts), and
  settings.

## Screens

- **Now.** A big blob of the running context at the top, breathing softly, with its
  emoji, name, path, a big rounded timer and "since 09:12". Stop is a round jelly
  button (long-press → backdated stop). "↩ Back to Job" is a big gummy pill in Job's
  color. Pinned contexts are gummy tiles in fixed slots, sleeping; tapping one squishes
  it, wakes it up and it hops into the big blob spot. Recents are small jelly beans.
- **Backdating.** Long-press a blob → a bouncy sheet with chunky chips "5 · 10 · 15 · 30
  · 45 min ago" and a friendly time picker.
- **Day.** The day as stacked jelly-bean pills on a vertical track, sized by duration;
  gaps as dotted "untracked" beans with a "+". Drag the little round knobs on a bean's
  ends to adjust. Tap for detail.
- **Week.** Totals as bubbles sized by time (circle packing) that jiggle when touched;
  targets as candy jars filling up ("Job jar 36:40 / 40:00"); fragmentation per day as
  bead strings, one bead per block, sized by length. Day mode too. Copy totals per
  context.
- **Stuff.** Contexts as a nested list of candy chips; the editor as a playful sheet
  with a hue picker of gummies and an emoji field.

## Signature moments

1. Tap to switch: the tile squishes, its face wakes, and it jumps into the big blob
   while the old one yawns and falls asleep.
2. Hitting a weekly target fills the jar to the brim with a little confetti burst.

Joy, but no friction: animations never block the next tap.
