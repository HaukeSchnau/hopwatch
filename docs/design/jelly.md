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

Code lives in `src/jelly/`, with thin routes in `src/app/`: a `(tabs)`
group (Now, Day, Week, Stuff, Settings) inside a Stack that presents the sheets (`start`,
`stop`, `pick`, `context`, `entry`) as native form sheets. Round two replaced the frame;
see [Round two](#round-two) below.

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
- The toast sits under open sheets and appears once the sheet closes.
- Switching from another tab or a sheet swaps the stage blob without a flight, since
  the Now screen isn't on screen to measure.
- Pin slots can't be rearranged in the UI (`movePin` is unused); new pins take the
  lowest free slot and never move.
- Checked on the simulator only. The nudge-to-stop-sheet path was checked in code, not
  with a real notification, and haptics and sound levels still need a real phone.

### Round two

Hauke picked Jelly's vibe but wanted it to feel native, like Glass, with Orbit's dial.
Round two keeps everything that is Jelly (the jellies with faces, the hop, beans, jars,
beads, confetti, sounds) and swaps the frame for iOS's own: native tabs, headers,
menus, sheets and forms, SF Pro Rounded, and a night mode. The stage became a candy
version of Orbit's 24-hour dial. The characters themselves (every jelly its own look)
were a parallel job, documented in [jelly-characters.md](jelly-characters.md).

#### The native frame

- **Tabs.** `JellyTabs.tsx` renders `NativeTabs` (Liquid Glass) with four SF Symbol tabs:
  Now (`face.smiling`), Day, Week (`circle.hexagongrid`, bubbles) and Stuff. The tint is
  the running jelly's candy ink, pink when nothing runs. The tab bar minimizes on scroll.
  Settings moved from a fifth tab to the gear in Stuff's header.
- **Mini player.** Away from Now, `NativeTabs.BottomAccessory` shows the running jelly
  awake at 38 pt with its name, "since 09:12", a ticking h:mm:ss and Stop (hold Stop for
  the "stopped earlier" menu). Tapping it goes to Now. In the minimized, inline placement
  it drops to the face and the timer.
- **Headers.** Day, Week and Stuff each sit in their own native Stack (`nav.tsx`,
  `TabStack`) with a transparent header whose buttons are tinted in the running candy
  color. Day and Week get a two-line rounded title ("Today" over "Tue 29 Sep") that
  jumps back to the present when tapped, and glass chevron buttons to step days or weeks.
  Stuff has a native large title, a stacked search field (`Stack.SearchBar`), the gear on
  the left and "+" on the right. Now has no header: the dial's corners carry the date,
  greeting and today's total, and the page fades out under the status bar.
- **Type.** Fredoka and Nunito are gone; everything is SF Pro Rounded through
  `fontFamily: 'ui-rounded'` with system weights (`text` styles in `theme.ts`) and
  tabular digits for times. Native titles (large titles, form sheet titles) stay SF Pro:
  UIKit headers and SwiftUI navigation titles can't take the rounded design from React
  Native.
- **Sheets.** Everything that isn't a tab is a native form sheet with a grabber. Settings,
  the jelly editor and entry detail are SwiftUI forms (`forms.tsx`: `NavigationStack`,
  `Form` on the page's cream or plum background, toolbar Close/Done/Add). Each opens with
  a candy row: React Native content in the form through `RNHostView` (the mascot and the
  idea in settings, the jelly with its time in entry detail, the draft jelly for a new
  one). For an existing jelly the characters' `LookEditor` is that row: its big live
  jelly, trait pickers, "Surprise me" and "Automatic". The time sheets (start, stop) and
  the picker keep their candy chips and use the native wheel and compact pickers.
- **Controls.** Native context menus (`MenuView` long-press) on the pinned tiles, the
  recents beans and the back pill ("Started earlier: 5 · 10 · 15 · 30 · 45 min ago", each
  with its clock time, "At a time…", "Edit X"), on Stop and the mini player's Stop
  ("Stopped earlier …", "At a time…"), and on every row in Stuff (the same starts plus
  Add inside, Pin, Move…, Archive, Delete). For the running jelly the "started" choices
  move its start. The menus live in `menus.ts`; a backdated start still hops out of the
  tile that was held. Stuff rows swipe (pin on the left; edit and archive on the right,
  `ReanimatedSwipeable`). Week's Day/Week switch is the native segmented control; "Show
  archived" and the sounds switch are native switches; the entry sheet uses SwiftUI date
  pickers in 24-hour time; the editor uses native pickers, toggles and steppers.
- **Night candy.** `theme.ts` has a light and a dark palette and `useTheme()` picks by the
  system appearance. By day the page is cream with plum ink; at night it's deep plum
  (#150F1D) with milk ink, raised cards and a darker groove. Candy stays candy: fills are
  the same, while tints, glows and the "ink" version of each hue (text and tint on the
  page, pushed until it reaches 3.6:1 by day and 5:1 at night) are computed per
  appearance. SwiftUI hosts get the matching `colorScheme`, and a `ThemeProvider` gives
  the native stacks the page color.
- **Motion.** Reduce Motion skips the hop (the jelly swaps into the dial), the
  breathing, idle hops, blinking and glancing, the head pulse and the ignition. Reanimated
  springs follow the system setting on their own.
- **Sounds.** The squishy-sounds preference moved from `jelly-prefs.json` to the core
  preference store (`usePref('jelly.sounds', …)`, `actions.setPref`).

#### The candy dial

`dial/CandyDial.tsx` is Orbit's ring (`dial/geometry.ts` is Orbit's math, copied) drawn
in candy with Skia: midnight at the bottom, noon on top, morning up the left side.

- **Groove.** The track is a candy ring shaded with a radial gradient (darker inside,
  pale rim outside), a gloss streak on its upper left and sugar dots at every hour. The
  rest of today is washed out, and a small pink pin marks now.
- **Beans.** Each entry is a jelly bean pressed into the groove: a stroke with round caps,
  shortened by the cap radius so its ends land exactly on its times, a 1.6 pt gap to its
  neighbours, tube shading across its width, a white gloss line and a soft colored
  shadow. Entries shorter than a bean's width become round candy beads.
- **Running bean.** It grows with the clock and wears a glowing head that breathes. A
  just-started entry shows at once as a bead, even before the day report's own clock
  catches up (`dayBeans`).
- **On Now** the dial is the stage (`now/Stage.tsx`): the running jelly sits in the ring's
  middle at 104 pt with its path, name and the big timer below it. The corners hold the
  greeting and date, today's total (opens Day), "since 09:12" (tap to correct the
  start) and Stop. The hop now lands in the ring's centre; on landing the new bean lights
  up: it pours along its arc, its head pops with an overshoot, a ripple runs out from it
  and the whole groove blushes in the jelly's color.
- **On Day** the dial sits above the bean timeline as the overview, with the day's total,
  bean count and median inside. Tapping an arc selects its bean: the dial gives it a
  halo and the timeline scrolls to it and haloes it too; tapping the same arc again opens
  the entry. Tapping a dark stretch opens "What was this?"; for a long gap the sheet
  preselects the hour around the tap, adjustable out to the whole gap.

#### On-device suggestions

A progressive enhancement Hauke asked for mid-round: with Apple's on-device model, naming
a new jelly suggests an emoji and a look. The characters builder owns the model side
(`character/suggest.ts`); the shell calls it.

- **Onboarding and new jellies** (`suggestions.ts`, `useNameSuggestion`): 600 ms after
  the last keystroke, with two or more characters, it asks with the parent path and the
  siblings. Answers for a name that changed in the meantime are dropped. Until the user
  touches the emoji, a suggested one fills in, marked with a small ✨ (a sparkle badge
  on the onboarding well, "Emoji ✨" and "✨ suggested" in the editor), and the preview
  jelly wears the suggested look (`Character`'s `look` prop). Creating the jelly saves
  the suggestion with `saveSuggestedLook` when it was made for the final name.
- **Existing jellies:** a "✨ Suggest" button next to the emoji asks again, fills the
  emoji (still editable) and saves the look.
- `useDressUp()` runs once in Jelly's layout. Without the model none of this shows, and
  nothing waits on it: typing, the emoji and saving work at once.

#### Verification

Checked on the Jelly simulator (iPhone 18 Pro, iOS 27) with sample data and with an
empty database, in light and dark: switching with the hop into the dial (recorded and
checked frame by frame), undo from the toast, back and resume, backdated start and stop
through the native menus, the stop sheet from a simulated nudge, knob drags with the
domain trimming the neighbour, gap fill from the dial, selecting beans from the dial,
entry detail, the jelly editor with the Look editor and a new jelly with a live model
suggestion, swipe actions and context menus in Stuff, both report modes, settings and
onboarding. Typecheck and lint are clean for Jelly. Screenshots: `.shots/j2s-*.png`; the
switch in night candy: `.shots/j2s-switch.gif`.

#### Known limitations (round two)

- Native titles (large titles and sheet titles) are SF Pro, not Rounded; React Native's
  header font path doesn't resolve `ui-rounded`.
- A new jelly's preview is seeded by a placeholder id, so the traits that come from the
  id (body, eyes, mouth) can differ once it's made with its real id; hinted and suggested
  traits carry over. See Core requests.
- The toast renders inside each tab (a tab's native stack covers anything layered over
  the tab bar) and still sits under open sheets.
- Beans on the Day timeline have no context menu; their detail is one tap away. Time
  sheets (start, stop) and the picker stay React Native with candy chips rather than
  SwiftUI forms, since the chips are the quickest way to backdate.
- Search in Stuff filters the list in place; it doesn't search notes or entries.
- The sample running entry from an old sample load can span days; the dial shows only
  today's part.


## Core requests

- ~~A small UI-preferences store.~~ Done in round two (`usePref`, `actions.setPref`);
  Jelly's sounds preference uses it and `jelly-prefs.json` is gone.
- **Create a context with a known id.** `actions.createContext` picks the id itself, so
  the editor's live preview of a new jelly is seeded by a placeholder and its id-seeded
  traits can change on "Add". An optional `id` in the input (or an exported id
  generator) would let the preview be exactly the jelly that gets made.
