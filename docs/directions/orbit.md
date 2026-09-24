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

## As built

Orbit is the dark, luminous take: one 24-hour dial that shows the day, switches it,
and repairs it. Midnight sits at the bottom and noon at the top, so the working day
arcs overhead like the sun. The same Skia dial (`Dial.tsx`) draws every ring in the
app: a dark band for the tracked past, a dotted hairline for the future, blocks as
arcs with bloom, the running block as a comet with a pulsing head, and a mint "now"
hand.

### Screens

- **Now** (`/orbit`). The dial with the running context, its parents, a live
  timer and "since 09:12" in the center, and a ring-shaped Stop under them. Below it
  the "Back to Job" pill glows in the target's color and says when you left
  ("left 12 min ago"); with nothing running it reads "Resume Job". Pinned contexts are
  orbs in a five-column grid with fixed slots (holes stay as dashed outlines); the
  running orb gets a halo with a moon circling it. Recents are chips in their own
  row, next to "All contexts", which opens the whole tree as a sheet. The date and
  today's total sit in the dial's empty top corners.
- **Day** (`/orbit/day?date=…`). The day's ring stays fixed while the entry list
  scrolls under it. Drag an arc end along the ring (5-minute detents, a haptic tick
  each); the knob and the center readout ("Dog ends 08:35 · 0:52 long") follow the
  finger, and the other arcs dim. At a joint the direction decides which entry
  grows, so the boundary moves without leaving a gap. Tap an arc for its entry, tap
  a dark stretch for "What was this?". Swipe sideways or use the chevrons for other
  days. The list shows every block with times and duration, and the gaps between
  blocks (5 min or more) as quiet "0:14 untracked · Fill" rows. The night before the
  first block stays on the ring only, so the list never nags about sleep.
- **Report** (`/orbit/report?mode=day|week&date=…`). Week mode: the total, seven
  small rings (Monday first) with each day's total and "blocks × median", target
  gauges that start a brighter second lap past 100 % ("Job 32:41 / 40:00", "−7:18"),
  and the totals tree as glowing bars. Day mode: one ring, block count, median and
  average, and the tree. Roots start expanded; every row has a copy button that puts
  `totalsText` for the range on the clipboard.
- **Contexts**. The tree with indentation guides and glowing moons. Tap a row to
  start it, the slider button (or a long-press) to edit, "+" for a new root.
  Archived contexts hide behind "Show archived (n)".
- **Settings**. The Lab, JSON export, copyable stop and resume links for Shortcuts,
  sample data and erase (both confirmed), and two lines about the idea.
- **Sheets**. Entry detail (context, start and end as native compact date pickers
  with ±5 min nudges, note, Stop now for the running entry, delete) with a small ring
  that lights the entry within its day. Context editor (name, emoji field plus a
  palette, 12 hue orbs plus "inherit", parent picker with search, pin toggle, weekly
  target in hours, nudge in minutes with the inherited value as placeholder, deep
  link with Copy, Add inside, Archive/Unarchive, Delete). "What was this?" with an
  adjustable range and the context picker. "All contexts" with search.
- **Welcome**. With no contexts the Now tab asks "What do you spend time on?" with a
  live preview: the ring and orb take the chosen color, emoji and name as you type.
  The context is created pinned. "or load three weeks of sample data" is the quiet
  alternative.

### Signature moments

1. **Ignition.** Every switch (orb, recent, Back, All contexts, a confirmed backdate)
   launches a comet in the new color that laps the whole ring once and lands on
   "now" with a flash and a soft haptic, while the center swaps to the new context
   and the orb's moon starts orbiting. It is decoration only: the switch itself is
   committed before the first frame.
2. **Scrubbing the ring.** Long-press an orb, a recent or the Back pill and the dial
   turns into a scrubber: a marker springs from "now" back to 15 minutes ago, the new
   arc is previewed from the marker to now, and the center reads "Job from 08:19 ·
   15 min ago · trims Lunch". Drag anywhere on the dial to move it, with a haptic
   tick per 5 minutes. Under the dial, chips offer −5/−10/−15/−30/−60 and a native
   time field picks an exact time; a big confirm pill says exactly what will happen
   ("Start Job at 08:19"). Tapping another orb changes the context without leaving
   the scrub. Long-press Stop for the same thing in red: the cut part of the running
   arc darkens and the confirm reads "Stop at 11:28".

### How the checklist is met

| Requirement | Where |
| --- | --- |
| First launch creates the first context, pinned; sample data as a quiet option | `Welcome.tsx` |
| Running timer with ancestors, start, live duration, Stop next to it | `now/NowHero.tsx` (`RunningReadout`, `LiveDuration` leaf) |
| Long-press Stop → backdated stop (5/10/15/30/60 min, or a time) | `now/NowHero.tsx`, `now/ScrubPanel.tsx` |
| "Back to X" / "Resume X" as the most prominent control | `now/BackPill.tsx` |
| Pinned grid with fixed slots, separate recents row | `now/OrbGrid.tsx`, `now/Recents.tsx` |
| Tap switches at once, "Switched to X · Undo" for 5 s (also stop, back, edits, deletes, fills) | `Toast.tsx`, with a burning fuse line |
| Long-press a tile → backdated start (N min ago or a time) | `now/ScrubPanel.tsx`, scrub gesture in `now/NowHero.tsx` |
| Full tree one tap away | "All contexts" sheet (`sheets/PickSheet.tsx`) and the Contexts tab |
| Nudge tap opens the backdated stop | `(tabs)/_layout.tsx` routes to Now, `now/NowScreen.tsx` consumes the intent |
| Tree: add root/child, rename, move, pin, archive/unarchive, delete, hue, emoji, target, nudge, deep link | `contexts/ContextsScreen.tsx`, `contexts/ContextEditor.tsx` |
| Day timeline: blocks, gaps, day navigation, edge drag with 5 min snap, tap block, tap gap | `day/DayRing.tsx`, `day/EntryList.tsx`, `day/DayScreen.tsx` |
| Entry detail: context, start, end, note, delete | `sheets/EntrySheet.tsx` |
| Report: day and week, expandable tree, targets, fragmentation per day, copy totals | `report/*` |
| Settings: Lab, export, sample data, erase, the idea | `SettingsScreen.tsx` |

Durations use `formatDuration` everywhere; the live timer adds seconds in small mono.
Orbit forces the dark appearance while it is mounted (`Appearance.setColorScheme`), so
native date pickers, alerts and the keyboard match, and resets it on unmount.

For testing on the simulator: `/orbit?scrub=start|stop` opens backdating,
`/orbit?welcome=1` previews onboarding, `/orbit/entry/running` opens the running
entry, and in development `/orbit?seed=sample` fills an empty database and
`?nudge=1` on any tab simulates a tapped nudge.

### Verified on the simulator

Switching (orb and Back), undo from the toast, backdated start by scrubbing and by
confirm, backdated stop (also reached through the simulated nudge from another tab),
stop and resume, dragging an arc end on the Day ring (neighbour trimmed), swiping
between days, filling a gap from the ring, editing an entry (−5 on the start),
creating a context, moving it under another parent with the searchable picker,
pinning it, archiving and showing archived, both report modes, copying totals (the
clipboard held the expected `totalsText`), erase from Settings, onboarding from the
empty database, the one-context home screen, and sample data reload from Settings.

Screenshots: `.shots/orbit-*.png` (home, ignition, scrub-start, nudge-stop, day,
day-drag, day-after-drag, day-empty, entry, fill, all-contexts, contexts,
context-editor, report-week, report-day, settings, erase-confirm, welcome,
home-first, switch-toast).

### Known limitations

- Dragging an arc end on a 24-hour ring is coarse: 5 minutes are about 3 pt of arc.
  The detents, haptics and the big readout help; the entry sheet (±5 buttons and a
  date picker) is the precise path. A magnified scrub for dense clusters of short
  entries would be the next step.
- Ends that meet at a joint always move together; shrinking one side to open a gap
  takes the entry sheet.
- A backdated start more than a few hours before midnight is drawn on today's ring at
  its clock position, which wraps into the evening side. The readout names the time,
  but the picture is ambiguous.
- The ignition and the scrub marker are Skia on the UI thread; I did not profile them
  on a real device.
- The seven small rings in the week strip are separate Skia canvases; fine for a
  week, not meant for months.

## Core requests

None blocking. Two small wishes, both worked around inside `src/directions/orbit`:

- `useDayReport` ticks every 15 s on its own `useNow`, and the Now dial needs its own
  `now` for the hand, so both tick. A `useDayReport(dayStart, now)` overload would let
  a screen drive one clock.
- A way to ask the timeline for "what a backdated start would trim" (the entries it
  cuts) would let the scrub readout use the domain instead of re-deriving it
  (`useTrimmed` in `now/NowHero.tsx` mirrors the rule: every entry ending after the
  new start, other than the same context).
