# Deck

**A pocket instrument for your day.** Stint as a piece of hardware in the spirit of
Teenage Engineering's OP-1 and Pocket Operators, Nothing's dot-matrix type and Braun
calculators. You don't tap buttons, you press keys. Switching should feel physical.

## Visual language

- Body: warm light aluminium (#D8D4CC-ish) with subtle brushed texture or noise,
  tiny printed labels in small caps mono ("ST-5 · TIME DEVICE"), fine screw or grid
  details. A dark mode is optional; the device can stay light.
- Display: an inset black LCD/OLED panel with a dot-matrix font (Doto) in warm amber or
  off-white, with a faint pixel grid and glow.
- Keys: chunky rounded keycaps with real depth (top highlight, side wall, bottom shadow)
  that travel down when pressed, with a haptic click. Caps are colored by hue from a
  TE-like palette: signal orange, cobalt, lemon, mint, graphite, off-white…
- Labels: Space Mono / Martian Mono / JetBrains Mono, uppercase, letter-spaced.
- Optional subtle key-click sounds with expo-audio; respect the silent switch.

## Structure

- One device, several modes. A row of mode keys (like hardware function keys):
  **SWITCH**, **LOG** (day timeline), **STATS** (report), **TREE** (contexts),
  **SYS** (settings). Modes change what the display and the key area show.

## Screens

- **SWITCH.** The LCD shows the running context (path scrolls like a marquee if long),
  a big dot-matrix timer and "SINCE 09:12", plus a tiny day bar. Under it, a wide
  orange key "◀ BACK TO JOB" and a STOP key. Then the keypad: pinned contexts as keycaps
  in fixed slots (empty slots are blank caps), each with an LED dot above it that lights
  while running. Recents as a row of small function keys.
- **Backdating: the knob.** Long-press a key or STOP and a rotary encoder appears
  (the LCD shows "START DOG −15 MIN · 09:47"). Drag around the knob to dial minutes back
  in 5-minute detents with haptic ticks, then press ENTER. A "SET TIME" key opens a
  precise picker.
- **LOG.** The day as a vertical tape: segments in cap colors, gaps as hatched blank
  tape with "+", a playhead for now. Drag a segment's edge to trim, tap a segment for
  detail (shown in the LCD style), tap a gap to fill.
- **STATS.** LCD-styled report: DAY/WEEK toggle keys, the totals tree as rows with
  segmented LED meters, targets as VU meters ("JOB ▮▮▮▮▮▮▮▮▯▯ 36:40/40:00 −3:20"),
  fragmentation per day as tiny bars. A COPY key copies totals.
- **TREE.** A file-browser-like list with indentation guides; edit a context on a
  "program" screen with keys for color and settings.
- **SYS.** Lab, export, sample data, erase, about.

## Signature moments

1. Pressing a key: real travel, a click haptic, the LED lighting and the LCD text
   scrolling in.
2. Dialing time back on the knob.

It must still be fast: one press switches, no confirmation.

## As built

Deck is a light aluminium device filling the whole screen: a black amber display at the
top, keycaps below, and five function keys along the bottom edge (SWITCH, LOG, STATS,
TREE, SYS). Every control is a key with travel. It sinks on press-in with a rigid haptic
and a tiny click (three synthesized WAVs under 3 KB, silent in silent mode, mixing with
music), and springs back on release. Actions fire on release, so scrolling over keys never
switches anything.

What changed from the brief, and why:

- **The transport sits at the bottom, not under the display.** BACK TO / RESUME is the most
  used control, so it gets the thumb position right above the function keys. The display
  stays at the top where it reads at a glance.
- **The keypad is a latching key bank**, like the preset buttons on an old tape deck. The
  running context's key stays pressed in (face lowered, slightly shaded, LED lit). Pressing
  another one pops it out and latches the new one.
- **The knob is a clock face turned backwards.** One detent is 5 minutes and 30°, so a full
  counter-clockwise turn is one hour, and the printed scale reads NOW, −15, −30, −45 like a
  clock. An orange LED arc traces the rewind. While the knob is out, the main display
  switches to program mode: "REWIND · START / HOUSEHOLD › DOG / −15 MIN / AT 06:33 / DEEP
  WORK ENDS", and the day bar hatches the stretch the rewind will cover.
- **Blank caps are assignable.** An empty slot is an unprinted keycap; pressing it assigns a
  context to that slot or programs a new one there.
- **Hints are printed on the body** ("HOLD A KEY TO REWIND"), the way synths print shift
  functions, so long-press is discoverable without a tutorial.

### Signature moments

1. **Switching.** Press a key: the cap bottoms out with a click, the old key pops up, the
   LED moves, the context name scrolls into the display from the right in 9 pixel steps,
   and the timer restarts at 0:00. An undo strip (a small display with a draining line and
   an orange UNDO key) slides up over the recents row.
2. **Dialling time back.** Hold any key, STOP or BACK: a brushed-metal knob (Skia: a sweep
   gradient that stays fixed to the light while the knurling and indicator rotate) slides
   up over the keypad. Turning it ticks through detents with a haptic each, pulls towards
   the nearest detent while held, bumps at its end stop, and the display follows live.

### How each requirement is met

- **First launch.** With no contexts, SWITCH shows "HELLO. PROGRAM YOUR FIRST KEY": name on a
  display-style field, 12 color keys, glyph keys, and a live preview keycap next to PRINT
  KEY 01. A glyph is suggested from the name until one is picked ("Walk the dog" gets 🐕).
  "Or load sample data to look around" is a quiet printed line. The mode bar stays hidden
  until the first key exists.
- **Home (SWITCH).** Display: color pixel, "PARENT › NAME" (a marquee when too long), a big
  dot-matrix H:MM with seconds as a small flourish, SINCE 09:12, today's total, and a 24 h
  day bar with a now marker. Only the timer leaf re-renders every half second. BACK TO X /
  RESUME X is the wide orange key; STOP is graphite and dims when idle. Pinned keys in fixed
  slots (holes stay blank), numbered 01–09 with an LED each; more pins add rows and the
  keypad scrolls. Recents are small function keys after an ALL key that opens the whole tree
  as a sheet. Tap switches immediately; undo covers switch, stop, back, edits, fills and
  deletes (`action.label`).
- **Backdating.** Holding a pinned key, a recent, BACK or STOP opens the knob with −5 / −10
  / −15 / −30 / −60 preset keys (disabled past the entry's start when stopping), SET TIME
  for a SwiftUI wheel of date and time, CANCEL and ENTER.
- **Nudge.** A tapped nudge sets the intent; the mode layout jumps to SWITCH, which opens the
  knob in stop mode and consumes the intent. Two taps: a preset, then ENTER.
- **Context tree (TREE).** A file browser on the display with indentation guides, color
  pixels, glyphs, key numbers (K03), a running marker, and an EDIT column. Tapping a row
  starts it; EDIT or a long press opens the PROGRAM sheet. + NEW adds a root context, and
  PROGRAM has "+ ADD A CHILD". The ARCHIVED key (with LED and count) shows archived nodes.
  PROGRAM covers name (saved on blur), color (12 keys plus AUTO to inherit), glyph, parent
  (MOVE with a picker that excludes the subtree), key slot (put on a key, remove it, move it
  one slot left or right), weekly target in hours, nudge threshold in 15-minute steps
  showing where the inherited value comes from, the start link with COPY, ARCHIVE /
  UNARCHIVE, and DELETE, which archives when the context has history.
- **Day timeline (LOG).** A paper tape in a recessed channel next to an engraved hour ruler
  (66 pt per hour): blocks in cap colors with glyph and name, times and durations printed
  beside them, hatched blank tape for gaps with a + on longer ones, and an orange NOW
  playhead. ◀ ▶ step days (hold ▶ for today); the header shows the total, block count and
  median. Tap a block for the entry sheet. Hold a block to trim: it lifts with grips on its
  edges, the others dim, the grips snap to 5 minutes with a tick each, a strip shows the
  live range, and releasing commits through `updateEntry`, so neighbours get trimmed. Tap a
  gap for "WHAT WAS THIS?": the whole gap when it is under 3 hours, otherwise the hour
  around the tap, with jog keys for both ends, the pinned keys, and the full tree.
- **Entry detail.** A sheet with the range on a display, the context as its keycap with
  CHANGE (inline tree picker), START and END as readouts with −5 / +5 jog keys that land on
  5-minute marks (tap the readout for a wheel), STOP NOW for a running entry, a note (saved
  on blur), DELETE and DONE.
- **Report (STATS).** DAY and WEEK latching keys with LEDs, ◀ ▶ ranges. The report is one
  display: range and total, target VU meters in week mode ("JOB 31:21 / 40:00 −8:38",
  overflow segments turn red past the target), then the totals tree with segmented meters
  and an inverted cursor row. Tapping a row expands it and moves the cursor; the COPY key
  names the cursor row and copies `totalsText` for the range. Day mode shows blocks, median
  and longest block. Week mode shows a bar per day with total, block count and median;
  tapping a day opens it in day mode.
- **Settings (SYS).** LAB, KEY CLICKS on/off (LED), EXPORT JSON, SAMPLE DATA and ERASE (both
  confirm), copyable stop and resume links, and a display explaining Deck.

### Testing hooks

Development builds read launch params so every state is reachable by route (release builds
ignore them): `/deck?dev=sample,start:2` (also `erase`, `stop`, `nudge`),
`/deck?knob=stop:15` / `knob=back` / `knob=start:4:15`, `/deck/log?offset=-1&trim=3`
(also `open=N`, `fill=N`), `/deck/stats?mode=week`, `/deck/tree?edit=5`. With `sim.sh`, use
`STINT_DIRECTION=deck` for routes like `/deck?…`, whose first segment isn't a bare `deck`.

### Known limitations

- The SwiftUI wheel in SET TIME and the time readouts uses system text colors in its dark
  scheme rather than amber.
- Sheets launched directly by route in development render full height; opened from the app
  they are form sheets.
- The click sounds go through expo-audio players and can lag the haptic slightly.
- With more than nine pinned contexts the keypad scrolls, and the fourth row peeks out
  under the recents row.
- In LOG, trimming needs a hold on the block first; a running block only has a start grip.
  Blocks under about 15 minutes show no label on the tape (they still open on tap).
- The REC dot blinks with an endless Reanimated loop, which keeps XCTest from seeing the
  app as idle; agent-device automation is slow on SWITCH because of it.
- The rewind knob goes back up to 12 hours; SET TIME covers the last 24 hours.

## Core requests

- **Per-direction preferences.** Deck stores its click-sound toggle in
  `Documents/deck-prefs.json` through expo-file-system because the core has no preference
  API. A small `getPref` / `setPref` on the existing meta table, namespaced per direction,
  would replace it.
- **When to ask for notification permission.** The nudge sync requests permission on the
  first start, so the system alert pops up in the middle of the first key press. Asking
  after onboarding, or through an explicit `requestNudgePermission()` a direction can call
  at a calm moment, would keep the first switch clean. Deck doesn't work around this.
