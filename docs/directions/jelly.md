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

## As built

Jelly is the brief, mostly as written, with one structural idea added: the stage and
the grid are one physical world. The running context's blob lives on the stage, and its
slot in the grid keeps an empty dashed dimple in exactly that blob's shape. Switching
moves blobs between the two. Each context also gets its own lumpy silhouette, seeded
from its id, so blobs can be told apart by shape as well as by color and emoji.

Code lives in `src/directions/jelly/`, with thin routes in `src/app/jelly/`: a `(tabs)`
group (Now, Day, Week, Stuff, Settings) inside a Stack that presents the sheets (`start`,
`stop`, `pick`, `context`, `entry`) as native form sheets.

### Signature moments

1. **The hop.** Tap a sleeping gummy: it squishes under your finger, its eyes pop open,
   and it hops along an arc onto the stage. At the same moment the old blob yawns, falls
   asleep and hops back into its dimple. Both flights stretch mid-air and land with a
   squash, a haptic and a quiet "bloop". Beans and the back pill launch blobs the same
   way; undo, deep links and the tree picker drop them in. The data changes on tap, and
   the animation never blocks the next tap (see `.shots/jelly-switch.gif`).
2. **Jars with confetti.** Weekly targets are glass candy jars that fill with wobbling
   jelly. A met target fills to the brim, gets a green "★ +2:47" and bursts candy
   confetti once per session, or again on tap.

Smaller touches: the running blob breathes, blinks, glances around and does a small
happy hop now and then. Timer digits drop in with a jelly bounce. The tab bar's pink
bubble stretches as it slides. Switches are gummy too.

### How each requirement is met

- **First launch.** With no contexts, the tabs layout shows the Welcome screen: a live
  preview blob that wears the chosen emoji and color, a name field, and "Make it!"
  (pinned by default). "or load sample data" sits quietly underneath. Erasing all data
  returns here.
- **Home (Now).** The stage shows the ancestors path, name, a big h:mm timer with
  seconds as a flourish, "since 09:12" (tap to correct the start) and a round Stop
  button (hold for the backdated stop sheet). Under it is "Back to X" / "Resume X", a
  full-width gummy pill in X's color (hold it to start X earlier). The pinned grid
  renders `usePinned().slots`, so holes stay holes. The recents row of jelly beans
  starts with an "All" bean that opens the whole tree. Any tile tap switches and shows
  "Switched to X · Undo". Holding a tile or bean opens the backdate sheet: 5/10/15/30/45
  min chips (each shows the clock time it lands on), a 24-hour wheel, and a line that
  says what gets cut ("Meetings stops at 11:35 · replaces 1 entry"). For the running
  context, the same sheet moves its start. A header chip shows today's total and opens
  Day.
- **Nudge intent.** The tabs layout consumes `{ kind: 'stop-sheet' }` and pushes the stop
  sheet, which reads "Still on X?" once the nudge threshold has passed.
- **Context tree (Stuff).** Every context is a candy chip with depth guides and a meta
  line (running, pinned, target, nudge, archived). Tap a row to start it, the pencil to
  edit it, or hold it for a native context menu: Edit, Add inside, Pin/Unpin, Move…,
  Archive/Unarchive, Delete. A switch shows archived jellies. The editor sheet has a
  live blob preview, name, emoji well with quick picks, the gummy hue picker (children
  get a "same as parent" swatch), Inside (move), Pinned, weekly target (stepper plus
  5/10/20/30/40 h chips), nudge (inherited value shown, stepper plus chips), the start
  link with Copy, Add inside, Archive and Delete. Delete explains when it archived
  instead. Edits to an existing jelly apply immediately; a new one is made with "Make
  it!".
- **Day timeline.** Jelly beans on a vertical track at 1.5 pt per minute, from 06–22 at
  least and stretched to fit. Dashed "+ untracked 0:35" beans mark gaps. The running
  bean pulses at its growing end, and a pink line marks now. Each bean has two knobs on
  its right side. Dragging one moves that edge in 5-minute steps with a time bubble and
  a haptic tick per step, and the domain trims neighbours on release. Tapping a bean
  opens the entry. Tapping a gap opens "What was this?" with From/To pickers clamped to
  the gap. The header shows tracked time, beans and the median, and steps days; the
  title jumps back to today.
- **Entry detail.** The header chip changes the context through the picker. Start and end
  are native time pickers for the entry's day (an end before the start means past
  midnight). It also shows the length, a note, Save/Done, Stop now for the running
  entry, and Delete. Times are drafted and saved together, so spinning a wheel never
  trims neighbours halfway.
- **Report (Week tab).** A gummy Day/Week toggle, arrows and "This week / 21–27 Sep"
  titles. It shows a big total and circle-packed bubbles for the top-level contexts (tap
  one to jiggle it and expand its branch). Week mode adds the target jars. Then comes
  the expandable totals tree (every node includes its subtree, archived ones marked),
  with `formatTargetLine` under targeted rows in week mode and a copy button per row
  (`totalsText` to the clipboard, confirmed in the toast). Fragmentation shows as bead
  strings: one bead per block, sized by length, with "13 · 0:39" per day, or a single
  string in Day mode.
- **Settings.** The idea in two lines next to a mascot, Open the Lab, Export data, a
  squishy sounds toggle, copy stop/resume links, load sample data and erase all data
  (both confirmed).

Undo shows for every timeline change (switch, stop, back, edits, fills, deletes). Knob
drags label their toast, e.g. "Deep work ends at 11:40".

### Known limitations

- Beans shorter than about 8 minutes have no knobs, because they'd cover their
  neighbours. Their times are still editable in the entry detail.
- During a knob drag the dragged bean overlaps its neighbour; the trim shows on release.
- The toast lives in the tabs layout, so it sits under open sheets and appears once the
  sheet closes.
- Switching from another tab or a sheet swaps the stage blob without a flight, since
  the Now screen isn't on screen to measure.
- Pin slots can't be rearranged in the UI (`movePin` is unused); new pins take the
  lowest free slot and never move.
- No night mode. Jelly always uses its light candy palette.
- Checked on the simulator only. The nudge-to-stop-sheet path was checked in code, not
  with a real notification, and haptics and sound levels still need a real phone.

## Core requests

- **A small UI-preferences store.** Jelly keeps one preference (squishy sounds on/off).
  Core has no way to store direction-specific settings, so Jelly writes
  `jelly-prefs.json` in the document directory with expo-file-system (`feedback.ts`). A
  `getMeta`/`setMeta` pair on `actions`, namespaced per direction, would remove that
  file.
