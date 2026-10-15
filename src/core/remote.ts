// Switching from anywhere. Taps on the Live Activity, widgets, Control Center controls,
// Siri, and Android's notification, tile and widget can happen while the app is closed.
// The native code that handles them can't use SQLite or the timeline's rules, so each tap
// appends a command to a queue: a start or a stop, stamped with the tap time and the entry
// that was open then. The app replays the queue here through timeline.ts, which stays the
// only writer of entries.
//
// A command applies only while the open entry is still the one it saw. Anything else means
// the app moved on since, or already replayed it before a crash, and the app wins. A start
// keeps the entry id native code made for it, so the Live Activity, the nudge and Slack
// stay keyed to the same entry, and a second replay finds it open and drops itself.
//
// The other direction is the snapshot: what native surfaces show, published by the app on
// every change (see src/widgets/surfaces.ts).

import type { ContextId, Entry, EntryId, Hue } from './model';
import * as timeline from './timeline';
import type { ContextTree } from './tree';

export interface RemoteCommand {
  /** Taps replay in this order. */
  seq: number;
  kind: 'start' | 'stop';
  /** A start's jelly. */
  contextId: ContextId | null;
  /** A start's new entry, with the id made where the tap happened. */
  entryId: EntryId | null;
  /** The entry that was open at the tap, or null when nothing ran. */
  expectOpen: EntryId | null;
  /** The tap's time. */
  at: number;
}

/**
 * A tap made ahead of time, for a button that can't make one when tapped (Android's
 * notification): start `contextId`, or stop for null, against the entry open now. The
 * native side stamps `seq` and `at` with the tap's time.
 */
export const tapCommand = (open: EntryId | null, contextId: ContextId | null, newId: () => string): Omit<RemoteCommand, 'seq' | 'at'> =>
  contextId === null
    ? { kind: 'stop', contextId: null, entryId: null, expectOpen: open }
    : { kind: 'start', contextId, entryId: newId() as EntryId, expectOpen: open };

const idOrNull = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : v === null ? null : undefined);

/** Reads a queued command, or null when it isn't one. */
export function parseCommand(json: string): RemoteCommand | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const c = raw as Record<string, unknown>;
  const contextId = idOrNull(c.contextId);
  const entryId = idOrNull(c.entryId);
  const expectOpen = idOrNull(c.expectOpen);
  if (typeof c.seq !== 'number' || typeof c.at !== 'number' || !Number.isFinite(c.at)) return null;
  if (contextId === undefined || entryId === undefined || expectOpen === undefined) return null;
  if (c.kind === 'start' && contextId !== null && entryId !== null) {
    return { seq: c.seq, kind: 'start', contextId: contextId as ContextId, entryId: entryId as EntryId, expectOpen: expectOpen as EntryId | null, at: c.at };
  }
  if (c.kind === 'stop') return { seq: c.seq, kind: 'stop', contextId: null, entryId: null, expectOpen: expectOpen as EntryId | null, at: c.at };
  return null;
}

/**
 * The rows one command writes, or null when it no longer applies: the open entry changed,
 * or its jelly is gone or archived. `clock.newId` makes ids for anything but the started
 * entry, which keeps the command's.
 */
export function replay(entries: readonly Entry[], tree: ContextTree, command: RemoteCommand, clock: timeline.Clock): Entry[] | null {
  const open = timeline.findOpen(entries);
  if ((open?.id ?? null) !== command.expectOpen) return null;
  const at = Math.min(command.at, clock.now);
  if (command.kind === 'stop') return open ? timeline.stop(entries, clock, at) : null;
  const context = command.contextId ? tree.byId.get(command.contextId) : undefined;
  if (!context || context.hidden || !command.entryId) return null;
  let keepId: EntryId | null = command.entryId;
  const newId = () => {
    const id = keepId ?? clock.newId();
    keepId = null;
    return id;
  };
  return timeline.start(entries, context.id, { ...clock, newId }, at);
}

/** A color for light and for dark appearance, as hex. */
export type DayNight = readonly [day: string, night: string];

/** A jelly's candy as native surfaces draw it. */
export interface JellyColors {
  /** The gummy's gradient from top to bottom, and `on` for an initial drawn on it. */
  light: string;
  fill: string;
  deep: string;
  on: string;
  /** The hue as text on the app's background. */
  accent: DayNight;
  /** A pale wash of the hue, behind "Back to X". */
  wash: DayNight;
}

/** The app's own colors for native surfaces. */
export interface Paint {
  bg: DayNight;
  ink: DayNight;
  muted: DayNight;
  /** The Stop button and its label. */
  stop: DayNight;
  onStop: DayNight;
}

/** A jelly as native surfaces draw it: its candy colors, its emoji or initial. */
export interface SnapshotJelly {
  id: ContextId;
  name: string;
  /** The ancestors, "Clients › Acme" for Website; empty for a top-level jelly. */
  parents: string;
  mark: string;
  hue: Hue;
  colors: JellyColors;
  /** The pin slot, or null when not pinned. */
  pin: number | null;
  nudgeMinutes: number;
}

/** What native surfaces show and need to handle a tap, as of the app's last change. */
export interface Snapshot {
  version: 1;
  running: { entryId: EntryId; contextId: ContextId; since: number } | null;
  /** The jelly "Back to" (while running) or "Resume" (when not) goes to. */
  back: ContextId | null;
  /** The latest entries, newest first, so native code can find "back" after its own taps. */
  recent: { id: EntryId; contextId: ContextId; start: number; end: number | null }[];
  /** Every jelly that can be started, in tree order. */
  jellies: SnapshotJelly[];
  paint: Paint;
  /** Words the surfaces show, in the app's language; `{name}` and `{duration}` get replaced. */
  strings: Record<string, string>;
}

const RECENT = 12;

/**
 * The snapshot of `entries` and `tree`. The colors come from the UI's theme, which core
 * doesn't know: `colors` turns a hue into candy, `paint` is the app's own.
 */
export function snapshotOf(
  entries: readonly Entry[],
  tree: ContextTree,
  colors: (hue: Hue) => JellyColors,
  paint: Paint,
  strings: Record<string, string>,
): Snapshot {
  const open = timeline.findOpen(entries);
  const back = timeline.previousContextId(entries);
  const live = entries.filter(timeline.isLive);
  return {
    version: 1,
    running: open ? { entryId: open.id, contextId: open.contextId, since: open.startUtc } : null,
    back: back && !tree.byId.get(back)?.hidden ? back : null,
    recent: live
      .slice(-RECENT)
      .reverse()
      .map((e) => ({ id: e.id, contextId: e.contextId, start: e.startUtc, end: e.endUtc })),
    jellies: tree.ordered
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        name: c.name,
        parents: c.ancestors.map((a) => a.name).join(' › '),
        mark: c.glyph ?? c.name.slice(0, 1).toUpperCase(),
        hue: c.hue,
        colors: colors(c.hue),
        pin: c.pinPosition,
        nudgeMinutes: c.nudgeMinutes,
      })),
    paint,
    strings,
  };
}
