// The timeline domain module. Every write to entries goes through these pure
// functions, and each one preserves two invariants:
//
//   1. Live entries never overlap.
//   2. At most one entry is open (endUtc === null).
//
// Closed entries shorter than MIN_ENTRY_MS are discarded whenever an operation
// produces them. Each function returns the rows it changed, including soft deletes,
// so the caller can persist them and derive an undo.

import { type ContextId, type Entry, type EntryId, MIN_ENTRY_MS } from './model';

export interface Clock {
  now: number;
  /** Local UTC offset in minutes at a given instant. */
  offsetAt: (ts: number) => number;
  newId: () => EntryId;
}

export interface EntryPatch {
  contextId?: ContextId;
  startUtc?: number;
  /** Only the open entry may keep null; closed entries cannot be reopened. */
  endUtc?: number | null;
  note?: string | null;
}

export interface Gap {
  start: number;
  end: number;
}

const endOf = (e: Entry) => e.endUtc ?? Number.POSITIVE_INFINITY;

export const isLive = (e: Entry) => e.deletedAt === null;
export const findOpen = (entries: readonly Entry[]) =>
  entries.find((e) => e.deletedAt === null && e.endUtc === null) ?? null;

/** A working copy of the live entries that records every row it touches. */
function draft(entries: readonly Entry[], clock: Clock) {
  const live = new Map<EntryId, Entry>();
  for (const e of entries) if (isLive(e)) live.set(e.id, e);
  const touched = new Map<EntryId, Entry>();

  const put = (e: Entry) => {
    const row = { ...e, updatedAt: clock.now };
    live.set(e.id, row);
    touched.set(e.id, row);
  };
  const remove = (e: Entry) => {
    live.delete(e.id);
    touched.set(e.id, { ...e, deletedAt: clock.now, updatedAt: clock.now });
  };
  /** Writes a candidate row, or removes it when it is closed and too short. */
  const keepOrDrop = (e: Entry) => {
    if (e.endUtc !== null && e.endUtc - e.startUtc < MIN_ENTRY_MS) remove(e);
    else put(e);
  };

  return {
    get: (id: EntryId) => live.get(id),
    live: () => [...live.values()],
    put,
    remove,
    keepOrDrop,
    result: () => [...touched.values()],
  };
}
type Draft = ReturnType<typeof draft>;

function newEntry(clock: Clock, contextId: ContextId, start: number, end: number | null): Entry {
  return {
    id: clock.newId(),
    contextId,
    startUtc: start,
    startOffsetMinutes: clock.offsetAt(start),
    endUtc: end,
    endOffsetMinutes: end === null ? null : clock.offsetAt(end),
    note: null,
    createdAt: clock.now,
    updatedAt: clock.now,
    deletedAt: null,
  };
}

/**
 * Clears [from, to) of every entry except `exceptId`. Entries inside the range are
 * removed, entries hanging over an edge are trimmed, and an entry spanning the whole
 * range is split in two. `to === null` means open-ended.
 */
function carve(d: Draft, clock: Clock, from: number, to: number | null, exceptId?: EntryId) {
  const until = to ?? Number.POSITIVE_INFINITY;
  for (const e of d.live()) {
    if (e.id === exceptId) continue;
    const end = endOf(e);
    if (end <= from || e.startUtc >= until) continue;

    const keepsHead = e.startUtc < from;
    const keepsTail = end > until;
    if (keepsHead && keepsTail) {
      d.keepOrDrop({ ...e, endUtc: from, endOffsetMinutes: clock.offsetAt(from) });
      d.keepOrDrop({ ...newEntry(clock, e.contextId, until, e.endUtc), endOffsetMinutes: e.endOffsetMinutes, note: e.note });
    } else if (keepsHead) {
      d.keepOrDrop({ ...e, endUtc: from, endOffsetMinutes: clock.offsetAt(from) });
    } else if (keepsTail) {
      d.keepOrDrop({ ...e, startUtc: until, startOffsetMinutes: clock.offsetAt(until) });
    } else {
      d.remove(e);
    }
  }
}

/**
 * Starts `contextId` at `at` (default now). A running entry ends at the same instant,
 * and a backdated start trims or removes whatever it overlaps. Starting the context
 * that already runs only moves its start earlier.
 */
export function start(entries: readonly Entry[], contextId: ContextId, clock: Clock, at?: number): Entry[] {
  const d = draft(entries, clock);
  const t = Math.min(at ?? clock.now, clock.now);
  const open = findOpen(d.live());

  if (open && open.contextId === contextId) {
    if (t >= open.startUtc) return [];
    carve(d, clock, t, open.startUtc, open.id);
    d.put({ ...open, startUtc: t, startOffsetMinutes: clock.offsetAt(t) });
    return d.result();
  }

  carve(d, clock, t, null);
  d.put(newEntry(clock, contextId, t, null));
  return d.result();
}

/** What a backdated start would do to the entries already there. */
export interface StartPreview {
  /** The entry the start cuts short, and where. A running one stops there. */
  cut: { entry: Entry; at: number } | null;
  /** Entries the start swallows whole, or leaves too short to keep. */
  replaced: Entry[];
}

/**
 * What `start(entries, contextId, …, at)` would do to the other entries, without doing
 * it, so the UI can say "Deep work stops at 14:50" first. Moving the running context's
 * start earlier counts the same way; the started or moved entry itself isn't listed.
 */
export function previewStart(entries: readonly Entry[], contextId: ContextId, at: number, now: number): StartPreview {
  // Only entries that end after the new start can be touched.
  const reach = entries.filter((e) => isLive(e) && endOf(e) > Math.min(at, now));
  const before = new Map(reach.map((e) => [e.id, e]));
  const open = findOpen(reach);
  const clock: Clock = { now, offsetAt: () => 0, newId: () => 'preview' as EntryId };
  const preview: StartPreview = { cut: null, replaced: [] };
  for (const row of start(reach, contextId, clock, at)) {
    const was = before.get(row.id);
    if (!was || (open?.contextId === contextId && was.id === open.id)) continue;
    if (row.deletedAt !== null) preview.replaced.push(was);
    else if (row.endUtc !== null) preview.cut = { entry: was, at: row.endUtc };
  }
  return preview;
}

/** Stops the running entry at `at` (default now), clamped to [start, now]. */
export function stop(entries: readonly Entry[], clock: Clock, at?: number): Entry[] {
  const d = draft(entries, clock);
  const open = findOpen(d.live());
  if (!open) return [];
  const end = Math.max(open.startUtc, Math.min(at ?? clock.now, clock.now));
  d.keepOrDrop({ ...open, endUtc: end, endOffsetMinutes: clock.offsetAt(end) });
  return d.result();
}

/**
 * Edits one entry. Times are clamped to now and end is never before start. Any
 * neighbour the new range overlaps is trimmed, split or removed.
 */
export function update(entries: readonly Entry[], id: EntryId, patch: EntryPatch, clock: Clock): Entry[] {
  const d = draft(entries, clock);
  const e = d.get(id);
  if (!e) return [];

  const startUtc = Math.min(patch.startUtc ?? e.startUtc, clock.now);
  const requestedEnd = patch.endUtc === undefined ? e.endUtc : patch.endUtc;
  // A closed entry can't be reopened: that could create a second open entry.
  const rawEnd = requestedEnd === null && e.endUtc !== null ? e.endUtc : requestedEnd;
  const endUtc = rawEnd === null ? null : Math.min(Math.max(rawEnd, startUtc), clock.now);

  const next: Entry = {
    ...e,
    contextId: patch.contextId ?? e.contextId,
    note: patch.note === undefined ? e.note : patch.note,
    startUtc,
    startOffsetMinutes: startUtc === e.startUtc ? e.startOffsetMinutes : clock.offsetAt(startUtc),
    endUtc,
    endOffsetMinutes:
      endUtc === e.endUtc ? e.endOffsetMinutes : endUtc === null ? null : clock.offsetAt(endUtc),
  };
  carve(d, clock, startUtc, endUtc, id);
  d.keepOrDrop(next);
  return d.result();
}

/** Soft-deletes one entry. */
export function remove(entries: readonly Entry[], id: EntryId, clock: Clock): Entry[] {
  const d = draft(entries, clock);
  const e = d.get(id);
  if (!e) return [];
  d.remove(e);
  return d.result();
}

/**
 * The untracked stretch around `at`, bounded by the neighbouring entries and now.
 * Null when `at` lies inside an entry or in the future.
 */
export function gapAt(entries: readonly Entry[], at: number, now: number): Gap | null {
  if (at >= now) return null;
  let start = Number.NEGATIVE_INFINITY;
  let end = now;
  for (const e of entries) {
    if (!isLive(e)) continue;
    const eEnd = endOf(e);
    if (e.startUtc <= at && at < eEnd) return null;
    if (eEnd <= at) start = Math.max(start, eEnd);
    if (e.startUtc > at) end = Math.min(end, e.startUtc);
  }
  return { start, end };
}

/**
 * Creates a closed entry for [from, to], clamped to the first gap inside that range.
 * The UI passes the bounds of the gap the user tapped, possibly adjusted.
 */
export function fillGap(
  entries: readonly Entry[],
  contextId: ContextId,
  from: number,
  to: number,
  clock: Clock,
): Entry[] {
  // The first free instant in the range is either `from` or the end of an entry.
  const probes = [from, ...entries.filter(isLive).map(endOf).filter((t) => t > from && t < to)].sort(
    (a, b) => a - b,
  );
  for (const probe of probes) {
    const gap = gapAt(entries, probe, clock.now);
    if (!gap) continue;
    const s = Math.max(from, gap.start);
    const e = Math.min(to, gap.end);
    if (e - s < MIN_ENTRY_MS) return [];
    const d = draft(entries, clock);
    d.put(newEntry(clock, contextId, s, e));
    return d.result();
  }
  return [];
}

/**
 * Logs `contextId` for [from, to] over whatever is already there: entries inside are
 * removed, entries hanging over an edge are trimmed, and one spanning the block is split
 * around it. Both times are clamped to now. The running entry goes on after a block that
 * ends before now, and stops at `from` when the block reaches now. Blocks under 30
 * seconds change nothing.
 */
export function place(
  entries: readonly Entry[],
  contextId: ContextId,
  from: number,
  to: number,
  clock: Clock,
): Entry[] {
  const end = Math.min(to, clock.now);
  const start = Math.min(from, end);
  if (end - start < MIN_ENTRY_MS) return [];
  const d = draft(entries, clock);
  carve(d, clock, start, end >= clock.now ? null : end);
  d.put(newEntry(clock, contextId, start, end));
  return d.result();
}

/** What placing a block does to the entries already there. */
export interface PlacePreview {
  /** The entry cut short at the block's start, and where. A running one stops there. */
  ended: { entry: Entry; at: number } | null;
  /** The entry that now starts at the block's end instead. */
  started: { entry: Entry; at: number } | null;
  /** The entry the block lands inside: it keeps its start and its end. */
  split: Entry | null;
  /** Entries the block covers whole, or leaves too short to keep. */
  replaced: Entry[];
}

/**
 * What `place(entries, contextId, from, to, …)` would do to the other entries, without
 * doing it, so the UI can say "Replaces Cooking 12:10–12:40" first.
 */
export function previewPlace(entries: readonly Entry[], contextId: ContextId, from: number, to: number, now: number): PlacePreview {
  const before = new Map(entries.filter(isLive).map((e) => [e.id, e]));
  let ids = 0;
  const clock: Clock = { now, offsetAt: () => 0, newId: () => `preview-${ids++}` as EntryId };
  const rows = place(entries, contextId, from, to, clock);
  const end = Math.min(to, now);
  const start = Math.min(from, end);
  // Only a block ending before now can land inside an entry; one reaching now cuts it.
  const inside = rows.length > 0 && end < now;
  const split = inside ? [...before.values()].find((e) => e.startUtc < start && endOf(e) > end) : undefined;
  const preview: PlacePreview = { ended: null, started: null, split: split ?? null, replaced: [] };
  for (const row of rows) {
    const was = before.get(row.id);
    if (!was || was === split) continue;
    if (row.deletedAt !== null) preview.replaced.push(was);
    else if (row.startUtc !== was.startUtc) preview.started = { entry: was, at: row.startUtc };
    else if (row.endUtc !== null) preview.ended = { entry: was, at: row.endUtc };
  }
  return preview;
}

/**
 * The context "Back to previous" should return to. While an entry runs, that is the
 * latest earlier entry with a different context. When nothing runs, it is the context
 * of the most recent entry, which the UI offers as "Resume".
 */
export function previousContextId(entries: readonly Entry[]): ContextId | null {
  const live = entries.filter(isLive).sort((a, b) => b.startUtc - a.startUtc);
  const open = live.find((e) => e.endUtc === null);
  if (!open) return live[0]?.contextId ?? null;
  for (const e of live) {
    if (e.startUtc < open.startUtc && e.contextId !== open.contextId) return e.contextId;
  }
  return null;
}

/**
 * The rows that revert `changed`, given the live entries from before the change.
 * Rows that existed come back as they were; rows the change created are deleted.
 */
export function inverse(before: readonly Entry[], changed: readonly Entry[], now: number): Entry[] {
  const prior = new Map(before.filter(isLive).map((e) => [e.id, e]));
  return changed.map((row) => {
    const was = prior.get(row.id);
    return was ? { ...was, updatedAt: now } : { ...row, deletedAt: now, updatedAt: now };
  });
}

/** Merges changed rows into a list of live entries, sorted by start. */
export function applyRows(entries: readonly Entry[], rows: readonly Entry[]): Entry[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const row of rows) {
    if (row.deletedAt === null) byId.set(row.id, row);
    else byId.delete(row.id);
  }
  return [...byId.values()].sort((a, b) => a.startUtc - b.startUtc);
}
