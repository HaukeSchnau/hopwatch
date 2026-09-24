import { describe, expect, it } from 'vitest';

import type { Context, ContextId, Entry, EntryId } from './model';
import { dayReport, formatTargetLine, totalsText, weekReport } from './reports';
import { sampleData } from './sample';
import { addDays, HOUR, MINUTE, startOfDay, startOfWeek } from './time';
import { buildTree } from './tree';

const context = (id: string, parentId: string | null, extra: Partial<Context> = {}): Context => ({
  id: id as ContextId,
  parentId: parentId as ContextId | null,
  name: id,
  color: null,
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  nudgeAfterMinutes: null,
  archivedAt: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...extra,
});

let n = 0;
const entry = (contextId: string, start: number, end: number | null): Entry => ({
  id: `e${n++}` as EntryId,
  contextId: contextId as ContextId,
  startUtc: start,
  startOffsetMinutes: 0,
  endUtc: end,
  endOffsetMinutes: end === null ? null : 0,
  note: null,
  createdAt: start,
  updatedAt: start,
  deletedAt: null,
});

// A Monday at local midnight, whatever the test machine's time zone.
const monday = startOfWeek(new Date(2026, 8, 23, 12).getTime());
const tree = buildTree([
  context('job', null, { weeklyTargetMinutes: 40 * 60 }),
  context('meetings', 'job'),
  context('clients', null),
  context('acme', 'clients', { archivedAt: 1 }),
]);

describe('reports', () => {
  it('splits an entry at local midnight', () => {
    const late = entry('acme', addDays(monday, 1) - HOUR, addDays(monday, 1) + 2 * HOUR);
    const now = addDays(monday, 3);
    const mon = dayReport([late], tree, monday, now);
    const tue = dayReport([late], tree, addDays(monday, 1), now);
    expect(mon.totals.total).toBe(HOUR);
    expect(tue.totals.total).toBe(2 * HOUR);
  });

  it('rolls subtree time up to every ancestor, archived nodes included', () => {
    const entries = [entry('job', monday + 9 * HOUR, monday + 11 * HOUR), entry('meetings', monday + 11 * HOUR, monday + 12 * HOUR), entry('acme', monday + 13 * HOUR, monday + 14 * HOUR)];
    const day = dayReport(entries, tree, monday, addDays(monday, 1));
    expect(day.totals.byId.get('job' as ContextId)?.total).toBe(3 * HOUR);
    expect(day.totals.byId.get('job' as ContextId)?.own).toBe(2 * HOUR);
    expect(day.totals.byId.get('clients' as ContextId)?.total).toBe(HOUR);
    expect(day.fragmentation).toEqual({ blocks: 3, median: HOUR });
    expect(day.gaps.map((g) => [g.start - monday, g.end - monday])).toEqual([
      [0, 9 * HOUR],
      [12 * HOUR, 13 * HOUR],
      [14 * HOUR, 24 * HOUR],
    ]);
  });

  it('clips a running entry to now and reports targets for the week', () => {
    const now = monday + 2 * 24 * HOUR + 10 * HOUR;
    const entries = [entry('job', monday + 8 * HOUR, monday + 17 * HOUR), entry('job', now - 2 * HOUR - 20 * MINUTE, null)];
    const week = weekReport(entries, tree, monday, now);
    const job = week.targets.find((t) => t.context.id === 'job')!;
    expect(formatTargetLine(job)).toBe('job 11:20 / 40:00 (−28:40)');
  });

  it('writes plain-text totals for one subtree', () => {
    const entries = [entry('meetings', monday + 9 * HOUR, monday + 10 * HOUR + 30 * MINUTE)];
    const text = totalsText(entries, tree, 'job' as ContextId, { start: monday, end: addDays(monday, 7) }, addDays(monday, 7));
    expect(text.split('\n')[0]).toMatch(/^job · .* · 1:30$/);
    expect(text).toContain('  meetings  1:30');
  });
});

describe('sample data', () => {
  it('never overlaps and has at most one running entry', () => {
    const now = new Date(2026, 8, 24, 15, 7).getTime();
    let id = 0;
    const { entries, contexts } = sampleData(now, () => `s${id++}`, () => 120);
    const sorted = [...entries].sort((a, b) => a.startUtc - b.startUtc);
    expect(sorted.filter((e) => e.endUtc === null).length).toBeLessThanOrEqual(1);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].endUtc!).toBeLessThanOrEqual(sorted[i].startUtc);
    expect(sorted.every((e) => e.startUtc < now)).toBe(true);
    expect(new Set(contexts.map((c) => c.pinPosition).filter((p) => p !== null)).size).toBe(9);
    expect(sorted[0].startUtc).toBeGreaterThanOrEqual(addDays(startOfDay(now), -20));
  });
});
