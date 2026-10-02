import * as fc from 'fast-check';
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

describe('previewing a backdated start', () => {
  // Job 06:00–06:30, then Client running since 06:30; now is 07:00.
  const now = T0 + 60 * MIN;
  let entries = timeline.applyRows([], timeline.start([], job, makeClock(T0)));
  entries = timeline.applyRows(entries, timeline.start(entries, client, makeClock(T0 + 30 * MIN)));
  const summary = (p: timeline.StartPreview) => ({
    cut: p.cut && [p.cut.entry.contextId, p.cut.at],
    replaced: p.replaced.map((e) => e.contextId),
  });

  it('names the entry it cuts short and the ones it swallows, like the start would', () => {
    expect(summary(timeline.previewStart(entries, dog, T0 + 50 * MIN, now))).toEqual({ cut: [client, T0 + 50 * MIN], replaced: [] });
    expect(summary(timeline.previewStart(entries, dog, T0 + 20 * MIN, now))).toEqual({ cut: [job, T0 + 20 * MIN], replaced: [client] });
  });

  it("leaves out the running entry when it's the one moving earlier", () => {
    expect(summary(timeline.previewStart(entries, client, T0 + 20 * MIN, now))).toEqual({ cut: [job, T0 + 20 * MIN], replaced: [] });
    expect(summary(timeline.previewStart(entries, client, T0 + 45 * MIN, now))).toEqual({ cut: null, replaced: [] });
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

describe('placing a block', () => {
  // Job 06:00–08:00 (with a note), Dog 08:00–08:30, then Client running since 09:00; now is 11:00.
  const now = T0 + 5 * 60 * MIN;
  const at = (minutes: number) => T0 + minutes * MIN;
  let entries: Entry[] = [];
  entries = timeline.applyRows(entries, timeline.start(entries, job, makeClock(at(0))));
  entries = timeline.applyRows(entries, timeline.start(entries, dog, makeClock(at(120))));
  entries = timeline.applyRows(entries, timeline.stop(entries, makeClock(at(150))));
  entries = timeline.applyRows(entries, timeline.start(entries, client, makeClock(at(180))));
  entries = entries.map((e) => (e.contextId === job ? { ...e, note: 'Standup' } : e));

  const placed = (from: number, to: number, context = dog) =>
    timeline.applyRows(entries, timeline.place(entries, context, from, to, makeClock(now)));
  const spans = (list: readonly Entry[]) => list.map((e) => [e.contextId, e.startUtc, e.endUtc]);
  const summary = (p: timeline.PlacePreview) => ({
    ended: p.ended && [p.ended.entry.contextId, p.ended.at],
    started: p.started && [p.started.entry.contextId, p.started.at],
    split: p.split?.contextId ?? null,
    replaced: p.replaced.map((e) => e.contextId),
  });

  it('trims what it overlaps at either edge and replaces what it covers', () => {
    const after = placed(at(90), at(200), client);
    expect(spans(after)).toEqual([
      [job, at(0), at(90)],
      [client, at(90), at(200)],
      [client, at(200), null],
    ]);
    expect(summary(timeline.previewPlace(entries, client, at(90), at(200), now))).toEqual({
      ended: [job, at(90)],
      started: [client, at(200)],
      split: null,
      replaced: [dog],
    });
    assertInvariants(after);
  });

  it('splits an entry it lands inside, and the tail keeps the note', () => {
    const after = placed(at(30), at(60));
    expect(spans(after)).toEqual([
      [job, at(0), at(30)],
      [dog, at(30), at(60)],
      [job, at(60), at(120)],
      [dog, at(120), at(150)],
      [client, at(180), null],
    ]);
    expect(after.map((e) => e.note)).toEqual(['Standup', null, 'Standup', null, null]);
    expect(summary(timeline.previewPlace(entries, dog, at(30), at(60), now))).toEqual({ ended: null, started: null, split: job, replaced: [] });
  });

  it('lets the running entry go on after a block inside it', () => {
    const after = placed(at(200), at(230));
    expect(spans(after).slice(-3)).toEqual([
      [client, at(180), at(200)],
      [dog, at(200), at(230)],
      [client, at(230), null],
    ]);
    expect(summary(timeline.previewPlace(entries, dog, at(200), at(230), now)).split).toBe(client);
    assertInvariants(after);
  });

  it('stops the running entry when the block reaches now, clamping a later end', () => {
    const after = placed(at(240), now + 60 * MIN);
    expect(spans(after).slice(-2)).toEqual([
      [client, at(180), at(240)],
      [dog, at(240), now],
    ]);
    expect(summary(timeline.previewPlace(entries, dog, at(240), now + 60 * MIN, now))).toEqual({
      ended: [client, at(240)],
      started: null,
      split: null,
      replaced: [],
    });
    assertInvariants(after);
  });

  it('changes nothing for a block shorter than 30 seconds or in the future', () => {
    expect(timeline.place(entries, dog, at(60), at(60) + 20_000, makeClock(now))).toEqual([]);
    expect(timeline.place(entries, dog, now + MIN, now + 60 * MIN, makeClock(now))).toEqual([]);
    expect(summary(timeline.previewPlace(entries, dog, at(60), at(60) + 20_000, now))).toEqual({ ended: null, started: null, split: null, replaced: [] });
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
  | { kind: 'place'; offset: number; length: number; context: ContextId }
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
  fc.record({ kind: fc.constant('place' as const), offset: minutesArb(600), length: minutesArb(240), context: contextArb }),
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
    case 'place':
      return timeline.place(entries, op.context, clock.now - op.offset, clock.now - op.offset + op.length, clock);
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

          if (op.kind === 'place') {
            // The preview names exactly the existing entries the block changes.
            const p = timeline.previewPlace(entries, op.context, now - op.offset, now - op.offset + op.length, now);
            const named = [p.ended?.entry, p.started?.entry, p.split, ...p.replaced].flatMap((e) => (e ? [e.id] : []));
            const touched = rows.filter((r) => entries.some((e) => e.id === r.id)).map((r) => r.id);
            expect(named.sort()).toEqual(touched.sort());
          }

          entries = next;
        }
      }),
      { numRuns: 400 },
    );
  });
});
