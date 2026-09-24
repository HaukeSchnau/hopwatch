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
