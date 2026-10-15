import { describe, expect, it } from 'vitest';

import { type Context, type ContextId, type DayOff, type DayOffId, type Entry, type EntryId, MONDAY_TO_FRIDAY } from './model';
import { dayReport, formatTargetLine, overtimeBalance, reviewGaps, totalsText, weekReport } from './reports';
import { sampleData } from './sample';
import { addDays, dayKey, HOUR, MINUTE, startOfDay, startOfWeek } from './time';
import { buildTree } from './tree';
import { offDaysOf } from './workdays';

const context = (id: string, parentId: string | null, extra: Partial<Context> = {}): Context => ({
  id: id as ContextId,
  parentId: parentId as ContextId | null,
  name: id,
  color: null,
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  workDays: null,
  balanceSince: null,
  balanceStartMinutes: 0,
  nudgeAfterMinutes: null,
  slackStatus: null,
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

describe('the evening review', () => {
  const at = (h: number, m = 0) => monday + h * HOUR + m * MINUTE;
  const spans = (gaps: { start: number; end: number }[]) => gaps.map((g) => [g.start - monday, g.end - monday]);

  it('asks about gaps between the first and last entry, not the night around them', () => {
    const entries = [entry('job', at(9), at(12)), entry('job', at(13), at(17)), entry('meetings', at(17, 10), at(18))];
    // 12–13 counts; the 10 minutes at 17:00 are too short; before 9 and after 18 don't count.
    expect(spans(reviewGaps(entries, tree, monday, at(21), []))).toEqual([[12 * HOUR, 13 * HOUR]]);
  });

  it('skips a gap inside a marked break', () => {
    const entries = [entry('job', at(9), at(12)), entry('job', at(12, 45), at(17))];
    expect(reviewGaps(entries, tree, monday, at(21), [[at(11, 55), at(12, 50)]])).toEqual([]);
    expect(reviewGaps(entries, tree, monday, at(21), [[at(12, 10), at(12, 45)]])).toHaveLength(1);
  });

  it('stops at the running entry and asks nothing on an empty day', () => {
    const entries = [entry('job', at(9), at(10)), entry('job', at(11), null)];
    expect(spans(reviewGaps(entries, tree, monday, at(15), []))).toEqual([[10 * HOUR, 11 * HOUR]]);
    expect(reviewGaps([], tree, monday, at(15), [])).toEqual([]);
  });
});

describe('job hours', () => {
  const day = (n: number) => addDays(monday, n);
  const off = (n: number): DayOff => ({ id: `o${n}` as DayOffId, day: dayKey(day(n)), kind: 'vacation', note: null, createdAt: 0, updatedAt: 0, deletedAt: null });
  const jobTree = buildTree([
    context('job', null, { weeklyTargetMinutes: 40 * 60, workDays: MONDAY_TO_FRIDAY, balanceSince: dayKey(monday), balanceStartMinutes: 120 }),
    context('meetings', 'job'),
    context('side', null, { weeklyTargetMinutes: 6 * 60 }),
  ]);
  const job = jobTree.byId.get('job' as ContextId)!;
  const workday = (n: number, hours: number, id = 'job') => entry(id, day(n) + 9 * HOUR, day(n) + 9 * HOUR + hours * HOUR);

  it('takes a day off and a public holiday off the target, but not off a plain one', () => {
    // 2026-09-21 is a Monday; Thursday is marked off, and Friday stands in for a holiday.
    const offDays = offDaysOf([off(3)], null);
    const withHoliday = (d: string) => offDays(d) || d === dayKey(day(4));
    const week = weekReport([workday(0, 9)], jobTree, monday, day(7), withHoliday);
    const [jobLine, sideLine] = week.targets;
    expect([jobLine.target, jobLine.daysOff]).toEqual([24 * HOUR, 2]);
    expect([sideLine.target, sideLine.daysOff]).toEqual([6 * HOUR, 0]);
  });

  it('keeps a balance from its start: tracked minus target for finished days, today apart', () => {
    const entries = [workday(0, 9), workday(1, 7), entry('meetings', day(1) + 17 * HOUR, day(1) + 18 * HOUR), workday(3, 8), workday(4, 3)];
    // Wednesday (day 2) is off; now is Friday 12:00.
    const result = overtimeBalance(entries, jobTree, job, offDaysOf([off(2)], null), day(4) + 12 * HOUR);
    // +2:00 start; Mon 9 − 8; Tue 7 + 1 (meetings) − 8; Wed off; Thu 8 − 8.
    expect(result?.balance).toBe(3 * HOUR);
    expect(result?.today).toEqual({ actual: 3 * HOUR, target: 8 * HOUR });
  });

  it('counts time on a day off as overtime, and keeps no balance without a start', () => {
    const result = overtimeBalance([workday(2, 2)], jobTree, job, offDaysOf([off(2)], null), day(3));
    // Mon and Tue untracked (−16), Wednesday off but worked (+2), +2 start.
    expect(result?.balance).toBe(-12 * HOUR);
    expect(overtimeBalance([], jobTree, jobTree.byId.get('side' as ContextId)!, offDaysOf([], null), day(3))).toBeNull();
  });
});
