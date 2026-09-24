# Building a direction

Stint Five ships five design directions of the same personal time tracker. They share
all data, domain logic and native modules, and differ only in UI. The product is
specified in [spec.md](spec.md); read it before designing anything. The active direction
is picked in the Lab (`/lab`) and stored on the device.

## What every direction must do

Each direction implements the whole MVP from the spec, fully working, on iPhone:

1. **First launch.** With no contexts, go straight to creating the first context (name,
   emoji, color; pinned by default). Offer "Load sample data" as a quiet secondary
   option (`loadSampleData()`), useful for judging the timeline and reports.
2. **Home, the switcher.** The app opens here.
   - Running timer: context with its ancestors, start time, live duration, and Stop next
     to it. Long-press Stop for a backdated stop ("5/10/15/30 min ago", or a time).
   - The most prominent control is "Back to X" (`useSwitchTarget()` + `actions.back()`).
     When nothing runs it reads "Resume X".
   - Pinned grid with fixed positions (`usePinned().slots` keeps holes, so tiles never
     move). Recents row, separate from the grid (`useRecents()`).
   - Tapping a tile switches immediately and shows "Switched to X · Undo" for a few
     seconds (`useUndoToast()` + `actions.undo()`). Undo also applies to stop, back,
     edits and deletes: the toast label comes ready-made in `action.label`.
   - Long-pressing a tile offers a backdated start: "started N minutes ago" or a
     specific time (`actions.start(id, { at })`).
   - The full tree is one tap away, for contexts that are neither pinned nor recent.
   - A tapped nudge notification sets `useIntent()` to `{ kind: 'stop-sheet' }`: open
     your backdated-stop UI and call `actions.consumeIntent()`.
3. **Context tree.** List all contexts; add (root or child), rename, move to another
   parent, pin/unpin, archive/unarchive (archived hidden behind a toggle), delete when
   possible (`actions.deleteContext` archives when it can't delete), set color (hue) and
   emoji, weekly target (hours) and nudge threshold (minutes, inherited). Each context's
   settings offer its deep link for copying (`startLink(id)` + expo-clipboard). Tapping
   a node starts it.
4. **Day timeline.** One day as vertical blocks in context colors, gaps visible.
   Navigate between days. Drag a block's edge to change start or end
   (`actions.updateEntry(id, { startUtc | endUtc })`; snap to 5 minutes; the domain trims
   neighbours). Tap a block for the entry detail. Tap a gap: "What was this?" → pick a
   context → `actions.fillGap(contextId, gap.start, gap.end)`.
5. **Entry detail.** Edit context, start, end and note; delete.
6. **Report.** Day and week modes. Expandable tree of totals where every node includes
   its subtree (`report.totals`). Week mode shows target lines like
   "Job 36:40 / 40:00 (−3:20)" (`report.targets`, `formatTargetLine`). Each day shows its
   block count and median block length (`report.fragmentation` per day). A button copies
   one context's totals as text (`totalsText(...)` + expo-clipboard).
7. **Settings.** Must include: open the Lab (`router.push('/lab')`), export JSON
   (`shareExport()`), load sample data and erase all data (both with confirmation, they
   replace everything), and one or two lines about the direction's idea.

Durations are always h:mm (`formatDuration`). A live timer may show seconds as a
flourish. Weeks start on Monday. Gaps are normal: never push the user to account for
the whole day.

## Ownership and rules

- You own `src/app/<id>/**`, `src/directions/<id>/**` and `docs/directions/<id>.md`.
  Edit nothing else. Five builders work in the same checkout at the same time.
- `src/core` is shared and read-only for you. If you need something from it, work around
  it inside your directory and list the request under "Core requests" in your docs file.
- Don't install packages. Everything below is already in the native build; a new native
  module would need a new build.
- Your home route is `/<id>` (`src/app/<id>/index.tsx`), with the layout in
  `src/app/<id>/_layout.tsx`. Keep route files thin and put components in
  `src/directions/<id>/`. Don't link to other directions, only to `/lab`.
- Every write goes through `actions`. Never touch SQLite, notifications or
  `src/core/timeline.ts` directly.
- TypeScript strict, no `any`, no casting wrappers. Match the comment style in
  `src/core`: short doc comments above components and non-obvious functions.

## Core API (`import { … } from '@/core'`)

Read `src/core/index.ts`, `hooks.ts`, `store.ts` and `model.ts`; they are short and
commented. The essentials:

- Reading: `useTree()` (`byId`, `roots`, `ordered` of `ResolvedContext` with resolved
  `hue`, `glyph`, `nudgeMinutes`, `depth`, `ancestors`, `childIds`, `hidden`),
  `useRunning()`, `useSwitchTarget()`, `usePinned()`, `useRecents()`,
  `usePickableContexts()`, `useContextById()`, `useEntry()`, `useNow(ms)`,
  `useDayReport(dayStart)`, `useWeekReport(weekStart)`, `useGapAt(ts)`,
  `useUndoToast()`, `useIntent()`, `useStint(selector)`.
- Writing: `actions.start / stop / back / undo / updateEntry / deleteEntry / fillGap /
  createContext / updateContext / moveContext / pin / unpin / movePin / archive /
  unarchive / deleteContext / setDirection / consumeIntent / dismissLastAction`,
  plus `shareExport()`, `loadSampleData()`, `eraseAllData()`.
- Time: `startOfDay`, `addDays`, `startOfWeek`, `dayRange`, `weekRange`,
  `formatDuration`, `formatSignedDuration`, `durationParts`, `formatClock`,
  `formatRelativeDay`, `formatWeekRange`, `formatLongDay`, `formatAgo`, `MINUTE`, `HOUR`.
- Colors are hue keys (`hues`: red, orange, amber, lime, green, teal, cyan, blue,
  indigo, violet, pink, gray). Map them onto your own palette with a
  `Record<Hue, …>`; `defaultHueHex` is only a neutral fallback.
- `pathLabel(context)` gives "Clients › Acme › Website". Deep links: `startLink(id)`,
  `stopLink`, `resumeLink` (scheme `stintfive://`).
- `useHideSplash(ready)` from `@/shell/splash`: call it in your layout once fonts load.

## Native building blocks

Docs for the exact SDK 57 APIs are in `~/context/expo-expo/docs/pages/versions/v57.0.0/sdk/`
and `~/context/expo-expo/docs/pages/router/`. Read them instead of relying on memory;
Expo changes every release.

- `@expo/ui`: SwiftUI components (`@expo/ui/swift-ui`: Host, Form, Section, Picker,
  DatePicker, Toggle, Slider, Gauge, ContextMenu, Menu, BottomSheet, Button, glass
  modifiers, RNHostView to embed RN views) and drop-ins: `@expo/ui/community/menu`
  (`MenuView`, `shouldOpenOnLongPress` gives a native context menu around any view),
  `@expo/ui/community/datetime-picker`, bottom sheet, picker, segmented control, slider.
- expo-router: Stack with `presentation: 'formSheet'` and `sheetAllowedDetents`,
  NativeTabs (`expo-router/unstable-native-tabs`, Liquid Glass tab bar), Link previews.
- `expo-glass-effect` (GlassView), `expo-blur`, `expo-linear-gradient`,
  `expo-mesh-gradient`, `@shopify/react-native-skia` (shaders, paths, blur),
  `react-native-svg`, `react-native-reanimated` 4, `react-native-gesture-handler`,
  `expo-haptics`, `expo-symbols` (SF Symbols), `expo-image`, `expo-audio` (short sounds;
  generate small WAVs if you want them and keep them subtle), `expo-clipboard`.
- Fonts: `@expo-google-fonts/` baloo-2, bricolage-grotesque, doto, fraunces, fredoka,
  geist, geist-mono, gloock, instrument-serif, inter, inter-tight, jetbrains-mono,
  martian-mono, newsreader, nunito, silkscreen, sora, space-grotesk, space-mono, syne,
  unbounded. iOS system fonts work too (`fontFamily: 'ui-rounded'`, `'ui-serif'`,
  `'ui-monospace'`).

## Quality bar

- Daily usability first. One-tap switching, the running state readable at a glance,
  primary actions within thumb reach, 44 pt touch targets, safe areas respected, the
  keyboard never covering inputs. It must hold up with 0, 1, 9 and 30 contexts, long
  names and deep trees, and a day with 25 entries.
- Then delight. Give the direction one or two signature moments worth a screen
  recording on Twitter: a transition, a gesture, a visual. Springs and haptics over
  linear tweens. Nothing that slows down switching.
- Keep ticking timers in small leaf components (`useNow`), so the whole screen doesn't
  re-render every second.

## Verifying

Each direction has its own Metro that ignores the other four directions (metro.config.js,
`STINT_DIRECTION`), so your edits only rebuild your bundle: glass on port 3101, deck 3102,
almanac 3103, orbit 3104, jelly 3105. Don't stop or restart them.

1. Type check incrementally (a full run takes minutes on a busy server):
   `npx tsc --noEmit --incremental --tsBuildInfoFile /tmp/<id>.tsbuildinfo 2>&1 | grep '<id>'`
   (other directions may be mid-edit).
2. Bundle check after each batch of edits: `scripts/sim.sh bundle <id>` must print 200;
   otherwise it prints Metro's error.
3. On your simulator, `scripts/sim.sh view UDID /<id> OUT.png` relaunches into a route
   on your Metro and screenshots it; `scripts/sim.sh run` adds taps. Look at every screen
   you build. Check the running timer, switching, undo, backdating, timeline drag, gap
   fill, the tree editor and both report modes, with sample data and with an empty
   database.
