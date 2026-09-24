# Almanac

**Your day, typeset.** Stint as a beautifully printed little publication. Serif
headlines on warm paper, risograph ink colors, a hand-drawn ink circle around what
you're doing. Calm, literate and a bit witty.

## Visual language

- Paper: warm off-white (#F3EDE2) with a subtle grain. Ink: near-black (#1C1A17).
  Dark mode optional; if you add it, make it a night edition, black paper with cream
  ink.
- Type: Instrument Serif (display and italics) for headlines and big numbers, a clean
  sans (Inter Tight or Geist) in small caps for labels, tabular figures for times.
  Newsreader or Fraunces for running text if you want.
- Hues map onto risograph inks: fluorescent pink, orange, sunflower, green, teal,
  federal blue, purple, burgundy, grey… Use them the way a riso print does: flat
  fills, a little misregistration (two layers slightly offset), multiply-like overlaps.
- Hairline rules, dotted leaders, numbered sections, a masthead.

## Structure

- A home "front page", with sections reached by typographic links rather than a tab
  bar: **The Day** (timeline), **The Week** (report), **Index** (contexts),
  **Colophon** (settings). Pages push and pop like turning to a section.

## Screens

- **Front page.** Masthead ("Stint" and the date line "Wednesday, 24 September · Week 39").
  The headline is a sentence about now, set huge: "You've been on *Acme Website* for
  1:24, since 09:12." Stop reads "Stop the clock"; long-press it for a backdated stop.
  "← Back to Job" is a large italic link-button with an ink underline. Pinned contexts
  are a typographic grid of words with a riso ink dot and emoji; the running one gets a
  hand-drawn ink circle. Recents are a line: "Lately: Dog, Groceries, Stint." A
  "Full index →" link opens the tree.
- **Backdating.** Long-press a word → a small paper slip slides up: "Started Dog…
  5 · 10 · 15 · 30 · 45 minutes ago, or at [time]".
- **The Day.** A ledger column: times in the margin, entries as ink bars with serif
  labels, gaps as dotted leaders "……… 0:45 untracked. What was this?". Drag an entry's
  top or bottom rule to adjust. Tap an entry for the detail page.
- **The Week.** An editorial spread: a big serif number for the week total, target
  lines as sentences and bars ("Job: 36:40 of 40:00, three hours twenty short"),
  riso-printed horizontal bars with misregistration for the totals tree, small
  multiples per day ("Mon · 9 blocks · median 0:34"). Day mode for a single day.
  "Copy for invoice" link per context.
- **Index.** An index of contexts with indentation, dotted leaders and totals like page
  numbers; the editor as a clean form in the same typography.
- **Colophon.** Lab, export, sample data, erase, about.

## Signature moments

1. On switch, the ink circle draws itself around the new word (SVG stroke animation)
   while the headline retypesets.
2. The riso misregistration shimmer on report bars.

Refined, not twee. Everything must stay quick to use.

## As built

Almanac is the Daily Stint: a small newspaper about your day, set in Instrument Serif,
Inter Tight small caps and Newsreader on warm stock, printed in twelve riso inks. Pages
push like turning to a section; slips (native form sheets on a darker stock) slide up for
anything quick. Code lives in `src/directions/almanac/`, routes in `src/app/almanac/`.

### Pages

- **Front page** (`/almanac`). Masthead with ears ("All the time that's fit to print";
  "Price: one tap per switch"), a dateline with the week and the edition number (day of
  the year), and the four sections as italic links: The Day, The Week, Index, Colophon. The lead is a sentence about now, set at 46 pt: "You've been on
  *Website* for 1:24, since 09:12." The kicker carries the ancestors and a live h:mm:ss;
  the name is set in its ink. Variants: "Now on *Dog*, as of 07:43." in the first
  minute, "Still on *Dog*? 1:10 and counting" past the nudge threshold, "Off the record
  for 0:40, since 17:32." when stopped, "A blank page." before the first entry. "Stop
  the clock" is a stamp beside it (long-press: backdated stop). "← Back to *Job*" /
  "↻ Resume *Job*" is the biggest control on the page, with a marker underline in Job's
  ink (long-press: start Job earlier). The pinned board is a three-column table of words
  with today's figure under each; slots keep their holes, and the first free cell after
  the last tile says "+ Pin another". Then "Lately: …" as a sentence of tappable names,
  "Full index →", and today as a 00–24 riso strip that opens The Day.
- **Slips** (`/almanac/slip`). "Started earlier: 🐕 *Dog*, since… 5 · 10 · 15 · 30 · 45
  min" as stamp keys, or a native date-and-time wheel and "Start Dog at 07:10". Under the
  button, a sentence says what the edit will do to the record: "Website stops at 07:10",
  "Meetings (0:03) is struck out". The stop slip clamps choices to the entry's start and
  says how long the entry will have run. A tapped nudge opens it as "Still on Dog?" with
  "It's still going. Keep it running".
- **The Day** (`/almanac/day?date=…`). A ledger column at 1.6 pt per minute: times in the
  margin, entries as blocks with a light screen of their ink, a solid ink bar down the
  left edge off register and a black top rule; labels in black ink shrink with the block.
  Gaps are dotted leaders, "0:45 untracked. *What was this?*", long ones read "7:43 off
  the record". Hold a block's tab (top-left for the start, bottom-right for the end) and
  drag: 5-minute snaps with a haptic tick, a time tag, and a live preview in which
  neighbours visibly trim or fade out before the domain commits. Tap a block for the entry,
  tap a gap for the "What was this?" slip (range adjustable; long gaps suggest the hour
  around the tap). The page opens scrolled to the action.
- **The Entry** (`/almanac/entry/[id]`). Kicker path, the name in its ink, "Refile" (the
  picker slip), a riso band with From/To in 50 pt figures; tapping one opens a wheel and
  "Set start to 09:15", again with the consequence sentence. Note in Newsreader italic on
  a rule, saved on leaving the field or the page. "Strike this entry" deletes (undo toast).
- **The Week** (`/almanac/week?mode=week|day&date=…`). A 112 pt total, targets as
  sentences ("*Job*: 30:13 of 40:00, nine hours forty-seven to go." or "… short/over")
  over bars with an outlined target box and tick, plus the literal
  `formatTargetLine` in small caps. "Where it went" is the totals tree with dotted leaders
  and two-drum riso bars; tapping a row opens its children and a "Copy Job for an invoice
  →" link (`totalsText`). "Day by day" prints each day as a barcode strip with "12 blocks ·
  median 0:41". Day mode: the day's total, "Nine blocks; the median one ran 0:34.", the
  day strip and its tree.
- **Index** (`/almanac/contexts`). The back-of-book index: indented entries, dotted
  leaders, this week's totals where the page numbers go, † for pinned, ‡ for archived,
  footnotes at the bottom. Tap starts the clock (the running one is circled in pen), hold
  for a native action sheet (start earlier, edit, add a sub-entry, pin/unpin, archive),
  "Edit" turns taps into editing, archived entries sit behind a toggle.
- **Index card** (`/almanac/context/[id]`, `/new?parent=&pin=1`). Name in 40 pt italic,
  "Filed under" as a native menu of valid parents, ↑ earlier / ↓ later among siblings,
  emoji tray (folded to two rows, plus any emoji), ink swatches with an "inherit" swatch,
  pin switch, weekly target in hours ("37.5" or "37:30"), nudge minutes with the
  inherited value as placeholder, the start link with Copy, Archive, and "Strike from the
  index" (archives instead when it has history). Saves as you go.
- **Colophon** (`/almanac/colophon`). What the edition is set and printed in (with the
  ink specimen), the press room (Lab, export, sample data, erase, both confirmed), and
  the stop/resume shortcut links.
- **First edition.** With no contexts, `/almanac` asks "What shall we keep time on
  first?" with a name, emoji tray, ink, a sentence previewing the word on the front page,
  "Set it in type →" (pinned), and a quiet "Load sample data".

### Signature moments

1. **The pen and the press.** On every switch the headline is set again word by word
   (each word drops into place with a 32 ms stagger) while a hand-drawn ink loop draws
   itself around the new word on the board, in that context's ink. The loop is seeded by
   the entry id, so every switch draws a slightly different circle; the Back underline
   is drawn fresh too.
2. **Misregistration.** Report bars roll out, then the second drum lands off register,
   shivers and settles (Reanimated spring). Dots, swatches, blocks and bands all carry a
   key plate slightly out of line.
3. **Label tape.** The undo toast is a strip of black tape stuck on at −1.2°, "Switched
   to Dog · UNDO", with a red fuse burning down the five-second window.

### Spec coverage

| Requirement | How |
| --- | --- |
| First launch creates a context | `FirstEdition`, pinned by default; sample data link |
| Running timer with ancestors, start, live duration, Stop beside | Lead: kicker path, headline, `Stopwatch` leaf, stamp |
| Backdated stop | Long-press Stop → stop slip (5/10/15/30 or wheel) |
| Back to previous / Resume | `useSwitchTarget` + `actions.back()`, the biggest control |
| Pinned grid, fixed positions | `usePinned().slots`, holes kept |
| Recents separate | "Lately" sentence (`useRecents(5)`) |
| Switch + undo toast | `switchTo` + global `UndoToast` (label from `action.label`) |
| Backdated start | Long-press any word → start slip |
| Full tree one tap away | "Index" section link and "Full index →" |
| Nudge intent | `useNudgeIntent` in the layout → stop slip, `consumeIntent()` |
| Tree: add, rename, move, pin, archive, delete, color, emoji, target, nudge, link | Index + Index card |
| Day timeline, drag edges, tap block, fill gap | The Day |
| Entry detail | The Entry |
| Day/week report, tree, targets, fragmentation, copy | The Week |
| Settings | Colophon |
| Durations h:mm | `formatDuration` everywhere; seconds only in the live kicker |

Ticking lives in leaf components (`Elapsed`, `Stopwatch` in `live.tsx`); pages refresh
on `useNow(30–60 s)`. Almanac forces the light appearance while it is focused
(`Appearance.setColorScheme`), so keyboards, menus and sheets match the paper; the Lab and
other directions get the system appearance back.

### Development aids

`/almanac/demo/<step>/…` (development only) sets up state without taps, because the
simulators are driven remotely: `sample`, `resample`, `erase`, `start:<name>[:<minutes
ago>]`, `stop`, `back`, `nudge`, and `to:<page>` (first, day, day-1, week, week-day,
contexts, colophon, new, entry, gap, slip-stop, slip-start:<name>, edit:<name>). Launch
routes can't carry query strings: NSUserDefaults parses `-stintRoute` values as old-style
plists, which don't allow `?` or `=`.

### Known limitations

- No night edition. Almanac is always printed on light paper.
- The timeline shows the whole 24-hour day at a fixed scale (no pinch zoom); a
  five-minute entry is an 8 pt sliver whose label is hidden, though it stays tappable,
  keeps its tabs and appears in the entry's day totals.
- Dragging a tab doesn't auto-scroll the page at the screen edge; drag in steps.
- The paper grain is subtle Skia noise and slightly cools the stock.
- Context edits (archive, move, pin) have no undo toast, because `lastAction` only
  covers timeline changes.

## Core requests

1. **Undo for context edits** (open). `lastAction` covers entries only, so archiving or
   moving a context can't be undone from the toast. Almanac keeps archive reversible via
   the archived toggle and the Index card.
2. **A label for `updateEntry`** (done in core). Almanac now passes one: drags and time
   edits toast "Dog now ends at 08:45", refiling toasts "Refiled under Acme", notes toast
   "Note filed".
