# Orbit

**The day as a clock.** Stint as a luminous 24-hour dial on a night-black screen.
Today's blocks orbit the ring as glowing arcs, the running one grows in real time with
a comet head, and you change the past by scrubbing the ring.

## Visual language

- Near-black background (#07080C) with a faint star or grain field. Dark only.
- Neon hues with bloom: arcs and dots glow (Skia blur or shadow), hairline rings and
  tick marks in low-contrast blue-grey.
- Type: Unbounded or Sora for display, JetBrains Mono or Geist Mono for digits and
  labels. Small, wide-tracked labels.
- Motion: everything eases on springs; arcs sweep in, dots orbit.

## Structure

- Home dial with a floating bottom bar of icons (glowing when active): **Now**,
  **Day**, **Week**, **Contexts**, and settings.

## Screens

- **Now.** A big 24-hour dial fills the top half: today's segments as arcs in context
  colors, gaps dark, a "now" hand, and the running arc growing live with a pulsing head.
  The dial's center shows the running context (emoji, name, path), the timer and
  "since 09:12". Stop is a ring button (long-press → backdated stop). Under the dial,
  a luminous pill "Back to Job". Pinned contexts are a grid of glowing orbs in fixed
  slots; the running one has a halo. Recents are smaller moons in a row.
- **Backdating on the dial.** Long-press an orb and the dial enters scrub mode: a
  marker on the ring shows the new start, dragging it back along the ring previews the
  arc ("Dog from 09:47 · −15 min"), with 5-minute haptic detents. Release or tap
  confirm. Offer an exact time picker too.
- **Day.** The day's ring large and centered, with the list of entries below. Drag an
  arc's endpoint along the ring to change a start or end; tap an arc for detail; tap
  a dark gap for "What was this?". A linear list below keeps precise editing easy.
  Swipe between days.
- **Week.** Seven small rings as small multiples, each with its total, block count and
  median. Totals tree as glowing horizontal bars, targets as a ring progress
  ("Job 36:40 / 40:00 −3:20"). Day mode shows one ring. Copy totals per context.
- **Contexts.** A tree with glowing color dots and indentation lines, and an editor
  sheet with a hue picker of orbs.

## Signature moments

1. Tapping an orb: its color sweeps into the ring as the new arc ignites.
2. Scrubbing the ring to backdate.

Legibility matters in the dark: the running context, timer and Back button must be
readable at a glance.
