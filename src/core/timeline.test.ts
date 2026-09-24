import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { type ContextId, type Entry, type EntryId, MIN_ENTRY_MS } from './model';
import * as timeline from './timeline';

const MIN = 60_000;
const T0 = Date.UTC(2026, 8, 21, 6, 0);
const ctx = (name: string) => name as ContextId;
const [job, dog, client] = [ctx('job'), ctx('dog'), ctx('client')];

let idCounter = 0;
function makeClock(now: number) {
  return {
    now,
    offsetAt: () => 120,
    newId: () => `e${idCounter++}` as EntryId,
  } satisfies timeline.Clock;
}

function assertInvariants(entries: readonly Entry[]) {
  const live = entries.filter(timeline.isLive).sort((a, b) => a.startUtc - b.startUtc);
  expect(live.filter((e) => e.endUtc === null).length).toBeLessThanOrEqual(1);
  for (const [i, e] of live.entries()) {
    if (e.endUtc !== null) {
      expect(e.endUtc - e.startUtc).toBeGreaterThanOrEqual(MIN_ENTRY_MS);
    }
    const next = live[i + 1];
    if (next) {
      // An open entry must be the last one, and closed entries must not overlap.
      expect(e.endUtc).not.toBeNull();
      expect(e.endUtc!).toBeLessThanOrEqual(next.startUtc);
    }
  }
}

describe('switching', () => {
  it('ends the running entry and starts the next at the same instant', () => {
    let entries = timeline.applyRows([], timeline.start([], job, makeClock(T0)));
    const at = T0 + 90 * MIN;
    entries = timeline.applyRows(entries, timeline.start(entries, dog, makeClock(at)));
    expect(entries.map((e) => [e.contextId, e.startUtc, e.endUtc])).toEqual([
      [job, T0, at],
      [dog, at, null],
    ]);
  });

  it('discards a running entry shorter than 30 seconds', () => {
    let entries = timeline.applyRows([], timeline.start([], job, makeClock(T0)));
    entries = timeline.applyRows(entries, timeline.start(entries, dog, makeClock(T0 + 10_000)));
    expect(entries.map((e) => e.contextId)).toEqual([dog]);
  });

  it('trims the earlier entry when a start is backdated into it', () => {
    let entries = timeline.applyRows([], timeline.start([], job, makeClock(T0)));
    const now = T0 + 60 * MIN;
    entries = timeline.applyRows(entries, timeline.start(entries, dog, makeClock(now), now - 20 * MIN));
    expect(entries.map((e) => [e.contextId, e.endUtc])).toEqual([
      [job, now - 20 * MIN],
      [dog, null],
    ]);
  });

  it('moves the start earlier when backdating the running context', () => {
    let entries = timeline.applyRows([], timeline.start([], job, makeClock(T0)));
    entries = timeline.applyRows(entries, timeline.start(entries, dog, makeClock(T0 + 60 * MIN)));
    entries = timeline.applyRows(
      entries,
      timeline.start(entries, dog, makeClock(T0 + 70 * MIN), T0 + 50 * MIN),
    );
    expect(entries.map((e) => [e.contextId, e.startUtc, e.endUtc])).toEqual([
      [job, T0, T0 + 50 * MIN],
      [dog, T0 + 50 * MIN, null],
    ]);
  });
});

describe('stopping', () => {
  it('clamps a backdated stop to the start of the entry', () => {
    let entries = timeline.applyRows([], timeline.start([], job, makeClock(T0)));
    const rows = timeline.stop(entries, makeClock(T0 + 60 * MIN), T0 - 60 * MIN);
    entries = timeline.applyRows(entries, rows);
    // Clamped to a zero-length entry, which is then discarded.
    expect(entries).toEqual([]);
  });
});

describe('editing', () => {
  it('splits a neighbour when an entry is moved into its middle', () => {
    let entries: Entry[] = [];
    entries = timeline.applyRows(entries, timeline.start(entries, job, makeClock(T0)));
    entries = timeline.applyRows(entries, timeline.stop(entries, makeClock(T0 + 8 * 60 * MIN)));
    const now = T0 + 9 * 60 * MIN;
    const gapRows = timeline.fillGap(entries, dog, now - 30 * MIN, now, makeClock(now));
    entries = timeline.applyRows(entries, gapRows);
    const walk = entries.find((e) => e.contextId === dog)!;
    entries = timeline.applyRows(
      entries,
      timeline.update(entries, walk.id, { startUtc: T0 + 3 * 60 * MIN, endUtc: T0 + 4 * 60 * MIN }, makeClock(now)),
    );
    expect(entries.map((e) => [e.contextId, e.startUtc, e.endUtc])).toEqual([
      [job, T0, T0 + 3 * 60 * MIN],
      [dog, T0 + 3 * 60 * MIN, T0 + 4 * 60 * MIN],
      [job, T0 + 4 * 60 * MIN, T0 + 8 * 60 * MIN],
    ]);
  });

  it('clamps a filled gap to its neighbours', () => {
    let entries: Entry[] = [];
    entries = timeline.applyRows(entries, timeline.start(entries, job, makeClock(T0)));
    entries = timeline.applyRows(entries, timeline.stop(entries, makeClock(T0 + 60 * MIN)));
    entries = timeline.applyRows(entries, timeline.start(entries, client, makeClock(T0 + 120 * MIN)));
    const rows = timeline.fillGap(entries, dog, T0 + 30 * MIN, T0 + 200 * MIN, makeClock(T0 + 150 * MIN));
    expect(rows.map((e) => [e.startUtc, e.endUtc])).toEqual([[T0 + 60 * MIN, T0 + 120 * MIN]]);
  });
});

describe('back to previous', () => {
  it('names the last different context while something runs, else the last one', () => {
    let entries: Entry[] = [];
    entries = timeline.applyRows(entries, timeline.start(entries, job, makeClock(T0)));
    expect(timeline.previousContextId(entries)).toBeNull();
    entries = timeline.applyRows(entries, timeline.start(entries, dog, makeClock(T0 + 60 * MIN)));
    expect(timeline.previousContextId(entries)).toBe(job);
    entries = timeline.applyRows(entries, timeline.stop(entries, makeClock(T0 + 90 * MIN)));
    expect(timeline.previousContextId(entries)).toBe(dog);
  });
});

// Property tests: random operation sequences keep the invariants, and undo restores.

type Op =
  | { kind: 'start'; context: ContextId; backdate: number }
  | { kind: 'stop'; backdate: number }
  | { kind: 'update'; pick: number; startShift: number; endShift: number; context: ContextId }
  | { kind: 'fill'; offset: number; length: number; context: ContextId }
  | { kind: 'remove'; pick: number };

const contextArb = fc.constantFrom(job, dog, client);
const minutesArb = (max: number) => fc.integer({ min: 0, max }).map((m) => m * MIN);
const opArb: fc.Arbitrary<Op> = fc.oneof(
  fc.record({ kind: fc.constant('start' as const), context: contextArb, backdate: minutesArb(120) }),
  fc.record({ kind: fc.constant('stop' as const), backdate: minutesArb(120) }),
  fc.record({
    kind: fc.constant('update' as const),
    pick: fc.nat(),
    startShift: fc.integer({ min: -180, max: 180 }).map((m) => m * MIN),
    endShift: fc.integer({ min: -180, max: 180 }).map((m) => m * MIN),
    context: contextArb,
  }),
  fc.record({ kind: fc.constant('fill' as const), offset: minutesArb(600), length: minutesArb(240), context: contextArb }),
  fc.record({ kind: fc.constant('remove' as const), pick: fc.nat() }),
);
const stepArb = fc.record({ op: opArb, advance: fc.integer({ min: 0, max: 240 }).map((m) => m * MIN + 7_000) });

function run(entries: Entry[], op: Op, clock: timeline.Clock): Entry[] {
  const pick = (i: number) => entries[i % Math.max(entries.length, 1)];
  switch (op.kind) {
    case 'start':
      return timeline.start(entries, op.context, clock, clock.now - op.backdate);
    case 'stop':
      return timeline.stop(entries, clock, clock.now - op.backdate);
    case 'update': {
      const e = pick(op.pick);
      if (!e) return [];
      return timeline.update(
        entries,
        e.id,
        {
          contextId: op.context,
          startUtc: e.startUtc + op.startShift,
          endUtc: e.endUtc === null ? null : e.endUtc + op.endShift,
        },
        clock,
      );
    }
    case 'fill':
      return timeline.fillGap(entries, op.context, clock.now - op.offset, clock.now - op.offset + op.length, clock);
    case 'remove': {
      const e = pick(op.pick);
      return e ? timeline.remove(entries, e.id, clock) : [];
    }
  }
}

const shape = (entries: readonly Entry[]) =>
  entries.map((e) => [e.id, e.contextId, e.startUtc, e.endUtc, e.note]);

describe('invariants', () => {
  it('hold after any sequence of operations, and undo restores the previous state', () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 1, maxLength: 40 }), (steps) => {
        let entries: Entry[] = [];
        let now = T0;
        for (const { op, advance } of steps) {
          now += advance;
          const clock = makeClock(now);
          const rows = run(entries, op, clock);
          const next = timeline.applyRows(entries, rows);
          assertInvariants(next);

          const undone = timeline.applyRows(next, timeline.inverse(entries, rows, now));
          expect(shape(undone)).toEqual(shape(entries));

          entries = next;
        }
      }),
      { numRuns: 400 },
    );
  });
});
