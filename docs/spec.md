# Personal Time Tracker: MVP Spec

Sep 18, 2026 · @Hauke Schnau

## Purpose

A personal iOS app, built with Expo, for tracking where time goes across the whole of life: full-time job, client work, side projects, household, the dog. It has one user and no accounts. The core interaction is switching between contexts with a single tap.

At the end of a week, the data should answer these questions:

- Where did my week go?
- How many hours did each client get?
- How fragmented are my days?
- Is there time left for side projects next to the full-time job?
- Am I working too many or too few hours on the full-time job, net of lunch, dog walks and shifted start and end times?

The full set of analyses is deliberately undecided. All of the questions above are queries over the same two tables, so the MVP concentrates on capturing clean data and keeps reporting minimal.

## Principles

1. **Switching is the product.** Any change of context takes one tap from the home screen. Starting B while A runs stops A and starts B at the same instant.
2. **There is no pause state.** Pausing is stopping, and resuming starts a new entry for the previous context. Every entry is one uninterrupted block, and its duration is always end minus start.
3. **One timer at a time.** Overlapping activities are not supported.
4. **The structure belongs to the user.** Contexts form a tree of arbitrary depth that is edited in the app. Life changes are handled by moving, renaming and archiving nodes, never by changing the app.
5. **Granularity emerges through use.** Any node can be tracked, not only leaves.
6. **Gaps are fine.** Untracked time is normal, and the app never pushes towards accounting for 24 hours.
7. **Forgetting is the main failure mode.** Backdating, gap filling, nudges and the "back to previous" button exist to make forgotten switches cheap to repair.
8. **Local first, sync-ready.** The MVP stores everything on the phone. The schema is shaped so that sync can be added later without a migration.

## MVP scope

The MVP is complete when all of the following work on the phone, offline:

- A context tree managed in the app: create, rename, move, archive, pin, and set a color or emoji.
- A home screen with the running timer, one-tap switching between pinned and recent contexts, and a "back to previous" button.
- Stop and resume, backdating on start and stop, and undo after a switch.
- A day timeline with editable blocks and gap filling.
- An optional note per entry.
- A day and week report rolled up over the tree, with an optional weekly target per context.
- A forgotten-timer nudge, configurable per context.
- Deep links for starting a context, stopping and resuming.
- Local SQLite storage with a sync-ready schema, plus a JSON export.

### Non-goals for the MVP

- Sync, a server, accounts or a web and desktop version
- Calendar integration of any kind
- Home screen widgets, Live Activities and native App Intents, deferred for scope and planned right after the MVP
- Billable flags, hourly rates and invoice exports
- Holiday and vacation handling, and a cumulative overtime balance
- Tags or any second dimension besides the tree
- Pomodoro features, and automatic tracking by location or calendar
- Dashboards beyond the day and week report

## Platform and build

The app is a standard Expo project with full access to native code. It never depends on Expo Go.

- **Development build.** Development runs in a custom dev client built with `expo-dev-client`, so native modules and extensions can be added at any time.
- **Generated native project.** The iOS project is generated from the app config through `expo prebuild`. Config plugins handle native setup such as the URL scheme, entitlements and extension targets, so the `ios` folder can stay out of version control.
- **Custom native code.** Swift code lives in local Expo modules inside the repo, for example for Live Activities and App Intents.
- **Builds and distribution.** Builds run locally with Xcode or through EAS Build, signed with the existing Apple developer account. Daily use runs a release build installed through TestFlight or directly on the device.

The native features listed as non-goals above are deferred to keep the MVP small, not because the stack rules them out.

## Data model

There are two tables, contexts and entries, stored in SQLite through `expo-sqlite`. Entries reference contexts by ID. Renaming or moving a context therefore reorganizes its history without touching any entry.

### contexts

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Generated on the device |
| parent\_id | UUID, nullable | Null for a root node; depth is unlimited |
| name | text |  |
| color | text, nullable | Inherited from the parent when null |
| emoji | text, nullable | Inherited from the parent when null |
| pin\_position | integer, nullable | Null means not pinned; pinned tiles keep fixed positions |
| sort\_order | integer | Order among siblings in the tree |
| weekly\_target\_minutes | integer, nullable | Applies to the whole subtree |
| nudge\_after\_minutes | integer, nullable | Inherited from the parent, then from the global default of 180 |
| archived\_at | timestamp, nullable | Archived nodes leave the pickers and stay in history and reports |

### entries

| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Generated on the device |
| context\_id | UUID | Any node, not only leaves |
| start\_utc | timestamp |  |
| start\_offset\_minutes | integer | Local UTC offset at the time of recording |
| end\_utc | timestamp, nullable | Null means the entry is running |
| end\_offset\_minutes | integer, nullable |  |
| note | text, nullable |  |

Both tables also carry `created_at`, `updated_at` and `deleted_at`. Deletes are soft. Together with the UUIDs, this is everything a later last-write-wins sync needs.

Contexts are never hard-deleted while entries reference them. A context without entries can be deleted, and any other context is archived.

## Invariants and time handling

Two invariants hold after every operation. They should live in one domain module with property-style tests, and no screen writes entries except through that module.

1. Entries never overlap.
2. At most one entry is open, meaning it has no end time.

Each editing operation preserves them in a defined way:

| Operation | Behaviour |
| --- | --- |
| Switch to B while A runs | A ends and B starts at the same timestamp |
| Start backdated into an earlier entry | The earlier entry is trimmed to end at the new start |
| Stop backdated | The end is clamped so that it is never before the entry's start |
| Drag a block edge into a neighbour | The neighbour is trimmed; a neighbour trimmed to under 30 seconds is removed |
| Fill a gap | The new entry is clamped to the gap |
| Undo a switch | The new entry is removed and the previous entry is reopened |
| Entry shorter than 30 seconds on stop or switch | Discarded automatically |

### Time

- Timestamps are stored in UTC together with the local offset at the time of recording.
- Entries may span midnight in storage. Reports split them at local midnight.
- Weeks start on Monday.
- Durations are displayed as hh:mm, never as decimals.

## Screens and interactions

### Home

The home screen is the switcher, and the app always opens on it.

- **Running timer** at the top, showing the context with its ancestors, the start time and a live duration. Stop sits next to it.
- **Back to previous.** While an entry runs, the most prominent button names the context that ran before it, for example "Back to Job". When nothing runs, the same button reads "Resume" plus the last context. This is expected to be the most used control, because the typical workday pattern is Job, then Dog, then Job again.
- **Pinned grid.** Tiles keep fixed positions and never reorder by usage, so they can be found by muscle memory and color.
- **Recents row**, separate from the grid.
- **Tapping a tile** switches immediately and shows a toast, "Switched to X · Undo", for a few seconds.
- **Long-pressing a tile** offers a backdated start, either "started N minutes ago" or a specific time.
- **Long-pressing Stop** offers a backdated stop.
- The full tree is one tap away, for contexts that are neither pinned nor recent.

On first launch the app goes straight to creating the first context, not to an empty grid.

### Context tree

The tree screen lists all contexts and allows adding, renaming, moving, pinning and archiving them, and setting a color or emoji. A context's settings also hold the optional weekly target and the nudge threshold. Tapping a node starts it, as on the home screen. Archived nodes are hidden behind a toggle.

### Day timeline

The timeline shows one day as vertical blocks in the contexts' colors, with gaps visible.

- Dragging a block's edge changes its start or end.
- Tapping a block opens the entry detail.
- Tapping a gap asks "what was this?" and creates an entry, clamped to that gap.

### Entry detail

The detail screen edits the context, the start, the end and the note, and it can delete the entry.

## Reports

The MVP has one report screen with a day and a week mode. It shows an expandable tree of totals, where every node's total includes its whole subtree, archived nodes included.

- **Weekly target.** A context with a target shows actual against target and the difference, for example "Job 36:40 / 40:00 (−3:20)". The day mode shows no target.
- **Fragmentation.** Each day shows its number of blocks and its median block length.
- **Copy totals.** A button copies the totals of one context for the selected range as plain text, for client hours.

The five questions from the purpose section map onto this screen as follows:

| Question | Answered by |
| --- | --- |
| Where did my week go? | Tree roll-up in week mode |
| How many hours did each client get? | The clients subtree, expanded |
| How fragmented are my days? | Blocks per day and median block length |
| Is there time left for side projects? | The side projects subtree next to the job subtree |
| Too many or too few job hours? | Weekly target line on the job context |

Anything beyond this runs on the exported data, outside the app, until a pattern proves worth building in.

## Nudges, deep links and export

### Forgotten-timer nudge

Starting an entry schedules one local notification for the moment the entry exceeds its context's nudge threshold. Stopping or switching cancels it. The threshold is inherited down the tree, with a global default of 180 minutes. A dog walk might use 60 minutes, the job 180. The notification opens the app, where a backdated stop takes two taps. Nothing here needs a server or background processing.

### Deep links

The app registers a URL scheme with three actions:

| Link | Action |
| --- | --- |
| `tracker://start?context=<id>` | Switch to that context |
| `tracker://stop` | Stop the running entry |
| `tracker://resume` | Start the previous context again |

The iOS Shortcuts app can open these links, which gives home screen icons for single contexts, the Action Button, Siri, and automations such as "when I arrive at the office, start Job". The app briefly comes to the foreground each time, until native App Intents replace this after the MVP. Each context's settings screen offers its link for copying.

### Export

A JSON export of all contexts and entries goes through the share sheet. It serves as the backup while there is no server, and as the raw material for ad-hoc analysis.

## After the MVP

The order below is a proposal, to be revisited after about a month of daily use.

1. **Live Activity.** The running timer on the lock screen and in the Dynamic Island. It ranks first because seeing the timer is the best protection against forgotten switches. It needs a widget extension target, added through a config plugin, and a local Expo module that starts and updates the activity. Community libraries may already cover part of this.
2. **Native App Intents**, so that Shortcuts and Siri can switch contexts without opening the app.
3. **Sync service** on one of the NixOS VPSs, single user, last-write-wins. It also opens the way to a web and desktop version through Expo's web target.
4. **Read-only ICS feed** served by the sync service, which any calendar app can subscribe to. It needs no OAuth and no CalDAV. Subscribed feeds refresh slowly, often every few hours, so this serves reviewing a day and not a live view.
5. **Job hours, extended.** Days off that reduce the target, and a cumulative overtime balance.
6. **Home screen widgets.**

### Open questions

- [ ] How should the job target treat holidays and vacation? To be decided after a month of real data.
- [ ] Which analyses are worth building into the app? To be decided from what gets run on the exports.
- [ ] Is the single-timer rule still right once whole-life tracking is routine?
