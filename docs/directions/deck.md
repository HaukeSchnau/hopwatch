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
