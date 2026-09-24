# Glass

**The one Apple would ship.** Stint as a first-party iOS 27 app: Liquid Glass, SF Pro,
native controls everywhere, and one twist. The whole room takes on the color of what
you're doing. Switch to Dog and the ambient mesh gradient behind the glass flows from
Job's blue to Dog's amber.

## Visual language

- System fonts only. SF Pro for UI, `ui-rounded` with tabular numerals for the timer and
  durations. Large titles.
- Materials: Liquid Glass (`expo-glass-effect`, `@expo/ui` glass button styles) over a
  slowly drifting `expo-mesh-gradient` tinted by the running context's hue. When nothing
  runs, the gradient settles into a calm neutral. Follows light and dark mode, and both
  have to look great.
- Hue palette: Apple system colors (systemRed, systemOrange, systemYellow, …), tuned per
  appearance.
- SF Symbols (`expo-symbols`) for every icon, with symbol effects where they help
  (bounce on switch, pulse on the running tile).

## Structure

- Native tab bar (`NativeTabs`, Liquid Glass): **Now**, **Day**, **Report**,
  **Contexts**. Settings sit behind a toolbar button on Contexts or Now.
- Sheets for detail: entry detail, context editor, backdate pickers, "What was this?"
  as `formSheet` with detents.

## Screens

- **Now.** A glass card for the running entry: breadcrumb path, a big rounded timer,
  "since 09:12" and a round glass Stop button (long-press → native context menu with
  backdated stops and "Pick a time…"). Below, a wide prominent glass button "Back to Job",
  tinted with Job's hue. Then a Control Center-like grid of pinned tiles: rounded
  squares with emoji or symbol and name; the running one fills with its color and glows.
  Long-press a tile → native context menu (`MenuView shouldOpenOnLongPress`) with "Started
  5 / 10 / 15 / 30 / 45 min ago", "At a time…" and "Edit context". Recents as a row of
  glass capsules. An "All contexts" capsule opens the tree as a sheet with search.
  Undo toast: a glass capsule floating above the tab bar.
- **Day.** Hour ruler with blocks as rounded rects tinted in context colors, gaps as
  dashed outlines with a "+" to fill. Drag handles on the selected block's edges with
  haptic ticks every 5 minutes. Date strip or chevrons plus a native date picker.
- **Report.** Native segmented control Day/Week. Expandable tree of totals in an
  inset-grouped list. Week targets as `Gauge`s or progress bars ("36:40 / 40:00").
  Per-day fragmentation as a small bar chart (blocks per day, median length).
  Swipe or context menu on a row to copy totals.
- **Contexts.** Inset-grouped hierarchical list with disclosure, swipe actions (pin,
  archive), and an editor built from `@expo/ui` Form, Section, TextField, Toggle,
  Picker and Stepper.

## Signature moments

1. The ambient mesh gradient morphing to the new context's color on every switch.
2. The tile you tap blooms with its color while the previous one fades, and the
   symbol bounces.

Keep it restrained. It should feel like Apple made it, not like a theme.

## As built

Glass is a native tab app (`NativeTabs`: Now, Day, Report, Contexts) with every detail
view as a form sheet over it. React Native draws the Now switcher, the timeline and
the report on Liquid Glass (`expo-glass-effect`). SwiftUI through `@expo/ui` draws the
forms (entry, context editor, settings), the Contexts list, the context menus, the
date pickers and the hero timer. Code lives in `src/directions/glass/`, routes in
`src/app/glass/`.

### The room

`Ambient` is a 3×3 `expo-mesh-gradient` built from the running context's system color
and its two neighbours on the color wheel. Light rooms are airy washes, dark rooms
glow out of black, and nothing running gives a pale pearl. On a switch the new room
is mounted on top and blooms in (1.1 s fade while it settles from a 14% zoom), then
the old layers are dropped. On Now the whole room drifts slowly (out-of-phase
translate, rotate and scale on the UI thread; off with Reduce Motion). Day, Report
and Contexts keep a still room so text stays easy to read. The tab bar's selected
tint also takes the running color.

### Signature moments

1. **Switching repaints the room.** Tap Dog while Job runs: the room blooms from
   blue to amber, the tab bar tint follows, and the "Back to Job" button turns blue.
2. **Tiles bloom from your finger.** The tapped tile fills with its color as a circle
   growing from the touch point, the emoji pops on a spring, and the previous tile
   fades back to glass. The running tile glows in its color and shows its duration.
3. **Rolling digits.** The hero timer is a SwiftUI `Text` with the numeric content
   transition, so every second rolls like the Clock app. Seconds are the smaller
   flourish; the h:mm part is the duration.
4. **A mini player for time.** Away from Now, the running timer rides above the tab
   bar as a `NativeTabs.BottomAccessory` (name, since, live timer, Stop), like Music's
   now playing bar.

### How the spec is met

- **First launch.** With no contexts, the tabs are replaced by onboarding: name,
  emoji (suggestions or typed), color. The room and a preview tile take the chosen
  color before the context exists. "or load sample data" sits underneath, with a
  confirmation.
- **Home.** Running card with path, name, rolling timer, "Since 09:12 · 3:40 today"
  and a round red glass Stop. Long-press Stop: native context menu with "5/10/15/30
  min ago" (only those after the start) and "Pick a Time…". Below it the tinted glass
  "Back to X" / "Resume X" button in the target's color. Then a row of glass capsules
  ("All contexts" first, then recents) and the pinned grid of four columns that renders
  `usePinned().slots`, holes included. Tiles and capsules long-press to "Started 5 /
  10 / 15 / 30 / 45 min ago", "At a Time…" and "Edit Context".
- **Undo.** Every timeline change shows a glass toast above the tab bar (above the
  mini player when it's there) with the ready-made label and Undo, for 6 seconds.
- **Full tree one tap away.** "All contexts" opens a sheet with search, the indented
  tree, a running indicator and "+" for a new context. Tap starts, long-press
  backdates.
- **Backdating with a time.** The backdate sheet has chips that commit immediately,
  a wheel date-and-time picker limited to valid times, and one line on the
  consequence ("Deep work ends at 09:12; 2 later entries are replaced").
- **Nudge.** A tapped nudge switches to Now and opens the stop sheet as "Still on
  Dog?", with "Now" and "N min ago" chips, so stopping at the right time is two taps.
- **Context tree.** A SwiftUI inset-grouped `List` with disclosure groups. Tap a row
  to start it, ⓘ to edit. Swipe right to pin or unpin, swipe left to archive or edit.
  Long-press for start now, started N min ago, at a time, edit, new context inside,
  pin, archive. Archived contexts hide behind a "Show Archived (n)" toggle. The editor
  is a native form: name, emoji field plus suggestions, 12 color swatches or "Same as
  parent", parent picker (move), pinned toggle, weekly target stepper (30 min steps),
  custom reminder stepper with the inherited value shown otherwise, the start link
  with Copy, archive or unarchive, and delete when the context has no entries or
  children. The form's controls take the context's color.
- **Day.** Large title, compact date picker, a Monday-first week strip with dots on
  tracked days, total, block count, median and a Screen Time-style bar of the day.
  Swipe the timeline sideways to change days. Blocks are pastel with a color edge,
  labels scale with height, notes show on tall blocks, and the running block pulses
  at its end. The red now-line is Calendar's. Gaps of 10 minutes to 4 hours between
  tracked blocks are dashed with "+ 0:45"; the night and other empty stretches stay
  quiet but are tappable. Tap a block for its detail. Long-press to select it: it
  turns solid with handles on the free edges. Dragging snaps to 5 minutes with a
  haptic tick per step and commits on release through `updateEntry`, so the domain
  trims the neighbours.
- **What was this?** From/To pickers clamped to the gap (the whole gap when short, an
  hour around the tap when long), the neighbouring contexts as one-tap chips, then
  every context with search.
- **Entry detail.** Native form with a header (emoji, path, duration), context picker,
  start and end pickers (or "Stop Now" while running), a note, and Delete with a
  confirmation. Everything applies together on the ✓, so a half-turned wheel never
  trims a neighbour. Delete and edits are undoable from the toast.
- **Report.** Segmented Day/Week and period paging. A summary card with the big total,
  per-day average (week) or blocks and median (day), and a split bar with legend.
  Week shows target rows as "Job 36:40 / 40:00" with a bar and the signed difference,
  and a fragmentation chart with blocks per day and each day's median under it. The
  totals tree expands per row. "Copy Totals" opens a native menu of every context
  with time in the period and copies `totalsText` for the chosen one; long-pressing a
  row does the same.
- **Settings.** A sheet from the gear on Now and Contexts: open the Lab, export JSON,
  load sample data and erase all data (both confirmed), the stop and resume links,
  and two lines on the idea.

### Testing hooks

In development, `/glass?dev=…` runs scripted steps once (sample, erase,
`start:Dog`, `startago:15:Dog`, back, stop, undo, nudge, `toast:60`, entry,
`context:Dog`, `open:/glass/pick`). `/glass/day?date=2026-09-24` opens a given day
and `/glass/report?mode=day` the day report. They exist because remote taps on the
shared builder took 20 s or more each; `src/directions/glass/devScript.ts` carries a
TODO to remove them.

### Known limitations

- The tile bloom and the room crossfade were checked from simulator recordings at a
  low frame rate on an overloaded builder. They need a look on a device for timing.
- Dragging a block edge doesn't auto-scroll the timeline, and there is no preview of
  the neighbours being trimmed until release.
- Pinned tiles can't be reordered in the app yet (`movePin` is unused). Pinning always
  takes the lowest free slot.
- The emoji field can't open the emoji keyboard directly; the suggestions cover the
  common cases, and any emoji can be typed after switching keyboards.
- The date pickers follow the device locale ("24. Sep 2026").
- Liquid Glass falls back to a system blur on older systems; that path is untested.

## Core requests

Both requests from the first pass landed in core: `formatAgo` says "just now" under a
minute, and `useNow` ticks on the second. Glass also passes its own toast label to
`updateEntry` when an edge is dragged ("Deep work ends at 12:05"). Nothing open.
