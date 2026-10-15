import { describe, expect, it } from 'vitest';

import type { Context, ContextId, Entry, EntryId } from './model';
import { parseCommand, type RemoteCommand, replay, snapshotOf } from './remote';
import * as timeline from './timeline';
import { buildTree } from './tree';

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 15, 7, 0);
const context = (id: string, extra: Partial<Context> = {}): Context => ({
  id: id as ContextId,
  parentId: null,
  name: id,
  color: 'blue',
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  workDays: null,
  balanceSince: null,
  balanceStartMinutes: 0,
  nudgeAfterMinutes: null,
  archivedAt: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...extra,
});
const tree = buildTree([context('job'), context('dog'), context('old', { archivedAt: 1 })]);
const [job, dog, old] = ['job', 'dog', 'old'] as ContextId[];

let n = 0;
const clock = (now: number): timeline.Clock => ({ now, offsetAt: () => 120, newId: () => `local${n++}` as EntryId });
const apply = (entries: Entry[], rows: Entry[] | null) => timeline.applyRows(entries, rows ?? []);
const start = (contextId: ContextId, entryId: string, expectOpen: EntryId | null, at: number, seq = 1): RemoteCommand => ({
  seq,
  kind: 'start',
  contextId,
  entryId: entryId as EntryId,
  expectOpen,
  at,
});

describe('replaying taps from outside the app', () => {
  // Job runs since 07:00.
  const running = apply([], timeline.start([], job, clock(T0)));
  const jobEntry = running[0].id;

  it('switches at the tap, keeping the id the tap made', () => {
    const after = apply(running, replay(running, tree, start(dog, 'tap1', jobEntry, T0 + 30 * MIN), clock(T0 + 40 * MIN)));
    expect(after.map((e) => [e.id, e.contextId, e.startUtc, e.endUtc])).toEqual([
      [jobEntry, job, T0, T0 + 30 * MIN],
      ['tap1', dog, T0 + 30 * MIN, null],
    ]);
  });

  it('drops a tap once the open entry has changed, so a second replay does nothing', () => {
    const command = start(dog, 'tap1', jobEntry, T0 + 30 * MIN);
    const once = apply(running, replay(running, tree, command, clock(T0 + 40 * MIN)));
    expect(replay(once, tree, command, clock(T0 + 41 * MIN))).toBeNull();
    const switchedInApp = apply(running, timeline.start(running, dog, clock(T0 + 35 * MIN)));
    expect(replay(switchedInApp, tree, command, clock(T0 + 40 * MIN))).toBeNull();
  });

  it('replays a chain of taps in order', () => {
    const first = start(dog, 'tap1', jobEntry, T0 + 30 * MIN, 1);
    const second = start(job, 'tap2', 'tap1' as EntryId, T0 + 50 * MIN, 2);
    const stop: RemoteCommand = { seq: 3, kind: 'stop', contextId: null, entryId: null, expectOpen: 'tap2' as EntryId, at: T0 + 70 * MIN };
    let entries = running;
    for (const command of [first, second, stop]) entries = apply(entries, replay(entries, tree, command, clock(T0 + 80 * MIN)));
    expect(entries.map((e) => [e.id, e.startUtc, e.endUtc])).toEqual([
      [jobEntry, T0, T0 + 30 * MIN],
      ['tap1', T0 + 30 * MIN, T0 + 50 * MIN],
      ['tap2', T0 + 50 * MIN, T0 + 70 * MIN],
    ]);
  });

  it("won't start an archived jelly", () => {
    expect(replay(running, tree, start(old, 'tap1', jobEntry, T0 + 30 * MIN), clock(T0 + 40 * MIN))).toBeNull();
  });

  it('reads only well-formed commands', () => {
    expect(parseCommand(JSON.stringify(start(dog, 'tap1', null, T0)))).toEqual(start(dog, 'tap1', null, T0));
    expect(parseCommand('{"seq":1,"kind":"start","contextId":null,"entryId":"x","expectOpen":null,"at":1}')).toBeNull();
    expect(parseCommand('not json')).toBeNull();
  });
});

describe('the snapshot', () => {
  it('names the running entry, where Back goes, and leaves archived jellies out', () => {
    let entries = apply([], timeline.start([], dog, clock(T0)));
    entries = apply(entries, timeline.start(entries, job, clock(T0 + 30 * MIN)));
    const pair = ['#fff', '#000'] as const;
    const colors = () => ({ light: '#fff', fill: '#888', deep: '#000', on: '#fff', accent: pair, wash: pair });
    const snapshot = snapshotOf(entries, tree, colors, { bg: pair, ink: pair, muted: pair, stop: pair, onStop: pair }, {});
    expect(snapshot.running?.contextId).toBe(job);
    expect(snapshot.back).toBe(dog);
    expect(snapshot.jellies.map((j) => j.id).sort()).toEqual([dog, job]);
    expect(snapshot.recent.map((e) => e.contextId)).toEqual([job, dog]);
  });
});
