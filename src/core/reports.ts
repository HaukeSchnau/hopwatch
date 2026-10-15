// Reports over entries and the context tree: day segments with gaps, subtree
// roll-ups with weekly targets, fragmentation, and the plain-text totals export.

import type { ContextId, Entry } from './model';
import { addDays, dayStart, formatDayMonth, formatDuration, formatSignedDuration, formatWeekday, formatWeekRange, MINUTE, startOfDay } from './time';
import { type ContextTree, pathLabel, type ResolvedContext, subtreeIds } from './tree';
import { dailyTarget, isJobHours, noOffDays, type OffDays, weekTarget } from './workdays';

/** An entry clipped to a range. A running entry is clipped to now. */
export interface Segment {
  entry: Entry;
  context: ResolvedContext;
  start: number;
  end: number;
  running: boolean;
  /** True when the entry continues before or after the range, e.g. across midnight. */
  clippedStart: boolean;
  clippedEnd: boolean;
}

export interface GapSegment {
  start: number;
  end: number;
}

export function segmentsIn(entries: readonly Entry[], tree: ContextTree, from: number, to: number, now: number): Segment[] {
  const segments: Segment[] = [];
  for (const entry of entries) {
    const context = tree.byId.get(entry.contextId);
    if (!context || entry.deletedAt !== null) continue;
    const entryEnd = entry.endUtc ?? now;
    const start = Math.max(entry.startUtc, from);
    const end = Math.min(entryEnd, to);
    if (end <= start) continue;
    segments.push({
      entry,
      context,
      start,
      end,
      running: entry.endUtc === null,
      clippedStart: entry.startUtc < from,
      clippedEnd: entryEnd > to,
    });
  }
  return segments.sort((a, b) => a.start - b.start);
}

/** Untracked stretches between segments inside [from, min(to, now)). */
export function gapsIn(segments: readonly Segment[], from: number, to: number, now: number): GapSegment[] {
  const limit = Math.min(to, now);
  const gaps: GapSegment[] = [];
  let cursor = from;
  for (const s of segments) {
    if (s.start > cursor) gaps.push({ start: cursor, end: Math.min(s.start, limit) });
    cursor = Math.max(cursor, s.end);
  }
  if (cursor < limit) gaps.push({ start: cursor, end: limit });
  return gaps.filter((g) => g.end > g.start);
}

/** A stretch the user marked as a break: untracked on purpose, so not worth asking about. */
export type Break = readonly [from: number, to: number];

/** Gaps shorter than this aren't worth an evening question. */
export const REVIEW_GAP_MS = 15 * MINUTE;

/**
 * The gaps worth a look at the end of the day starting `dayStart`: untracked stretches of
 * at least REVIEW_GAP_MS between the day's first tracked moment and its last, minus
 * marked breaks. Time before the first entry and after the last never counts, so the
 * night doesn't either.
 */
export function reviewGaps(entries: readonly Entry[], tree: ContextTree, dayStart: number, now: number, breaks: readonly Break[]): GapSegment[] {
  const segments = segmentsIn(entries, tree, dayStart, addDays(dayStart, 1), now);
  if (segments.length === 0) return [];
  const last = Math.max(...segments.map((s) => s.end));
  return gapsIn(segments, segments[0].start, last, now).filter(
    (g) => g.end - g.start >= REVIEW_GAP_MS && !breaks.some(([from, to]) => from <= g.start && to >= g.end),
  );
}

export interface TotalsNode {
  context: ResolvedContext;
  /** Time tracked on this node itself. */
  own: number;
  /** Time tracked on this node and its whole subtree. */
  total: number;
  /** Only nodes whose subtree has time, in sibling order. */
  children: TotalsNode[];
}

export interface Totals {
  roots: TotalsNode[];
  byId: ReadonlyMap<ContextId, TotalsNode>;
  total: number;
}

/** Rolls segment time up the tree. Archived nodes are included. */
export function totals(tree: ContextTree, segments: readonly Segment[]): Totals {
  const own = new Map<ContextId, number>();
  for (const s of segments) own.set(s.context.id, (own.get(s.context.id) ?? 0) + (s.end - s.start));

  const byId = new Map<ContextId, TotalsNode>();
  const build = (id: ContextId): TotalsNode | null => {
    const context = tree.byId.get(id);
    if (!context) return null;
    const children = context.childIds.map(build).filter((n): n is TotalsNode => n !== null);
    const mine = own.get(id) ?? 0;
    const total = mine + children.reduce((sum, c) => sum + c.total, 0);
    if (total === 0) return null;
    const node = { context, own: mine, total, children };
    byId.set(id, node);
    return node;
  };
  const roots = tree.roots.map(build).filter((n): n is TotalsNode => n !== null);
  return { roots, byId, total: roots.reduce((sum, r) => sum + r.total, 0) };
}

export interface Fragmentation {
  blocks: number;
  /** Median block length in ms, 0 without blocks. */
  median: number;
}

export function fragmentation(segments: readonly Segment[]): Fragmentation {
  const lengths = segments.map((s) => s.end - s.start).sort((a, b) => a - b);
  if (lengths.length === 0) return { blocks: 0, median: 0 };
  const mid = Math.floor(lengths.length / 2);
  const median = lengths.length % 2 ? lengths[mid] : (lengths[mid - 1] + lengths[mid]) / 2;
  return { blocks: lengths.length, median };
}

export interface DayReport {
  start: number;
  end: number;
  segments: Segment[];
  gaps: GapSegment[];
  totals: Totals;
  fragmentation: Fragmentation;
}

export function dayReport(entries: readonly Entry[], tree: ContextTree, dayStart: number, now: number): DayReport {
  const end = addDays(dayStart, 1);
  const segments = segmentsIn(entries, tree, dayStart, end, now);
  return {
    start: dayStart,
    end,
    segments,
    gaps: gapsIn(segments, dayStart, end, now),
    totals: totals(tree, segments),
    fragmentation: fragmentation(segments),
  };
}

export interface TargetLine {
  context: ResolvedContext;
  actual: number;
  /** For job hours, already less the shares of the week's days off. */
  target: number;
  /** actual − target; negative means behind. */
  diff: number;
  /** Job hours: the work days this week that were off (days off, public holidays). */
  daysOff: number;
}

export interface WeekReport {
  start: number;
  end: number;
  days: DayReport[];
  totals: Totals;
  /** Every context with a weekly target, archived ones included, in tree order. */
  targets: TargetLine[];
}

export function weekReport(
  entries: readonly Entry[],
  tree: ContextTree,
  weekStart: number,
  now: number,
  offDays: OffDays = noOffDays,
): WeekReport {
  const days = Array.from({ length: 7 }, (_, i) => dayReport(entries, tree, addDays(weekStart, i), now));
  const segments = days.flatMap((d) => d.segments);
  const weekTotals = totals(tree, segments);
  const targets = tree.ordered
    .filter((c) => c.weeklyTargetMinutes !== null)
    .map((context) => {
      const actual = weekTotals.byId.get(context.id)?.total ?? 0;
      const { target, daysOff } = weekTarget(context, weekStart, offDays);
      return { context, actual, target, diff: actual - target, daysOff };
    });
  return { start: weekStart, end: addDays(weekStart, 7), days, totals: weekTotals, targets };
}

export interface OvertimeBalance {
  /** The starting balance plus tracked minus target time for every finished day. */
  balance: number;
  /** Today so far, which the balance leaves out until the day is over. */
  today: { actual: number; target: number };
}

/**
 * The overtime balance of a job-hours context with a balance start: tracked time in its
 * subtree minus its daily targets, for every day from `balanceSince` through yesterday,
 * plus the starting balance. Null for any other context.
 */
export function overtimeBalance(
  entries: readonly Entry[],
  tree: ContextTree,
  context: ResolvedContext,
  offDays: OffDays,
  now: number,
): OvertimeBalance | null {
  if (!isJobHours(context) || context.balanceSince === null) return null;
  const ids = subtreeIds(tree, context.id);
  const tracked = (from: number, to: number) =>
    from >= to ? 0 : segmentsIn(entries, tree, from, to, now).reduce((sum, s) => (ids.has(s.context.id) ? sum + s.end - s.start : sum), 0);
  const today = startOfDay(now);
  const since = dayStart(context.balanceSince);
  let target = 0;
  for (let day = since; day < today; day = addDays(day, 1)) target += dailyTarget(context, day, offDays);
  return {
    balance: context.balanceStartMinutes * MINUTE + tracked(since, today) - target,
    today: { actual: tracked(today, addDays(today, 1)), target: since <= today ? dailyTarget(context, today, offDays) : 0 },
  };
}

/** "Job 36:40 / 40:00 (−3:20)" */
export const formatTargetLine = (line: TargetLine) =>
  `${line.context.name} ${formatDuration(line.actual)} / ${formatDuration(line.target)} (${formatSignedDuration(line.diff)})`;

/**
 * Plain-text totals of one context's subtree for a range of days, for pasting client
 * hours into an email or invoice.
 */
export function totalsText(
  entries: readonly Entry[],
  tree: ContextTree,
  contextId: ContextId,
  range: { start: number; end: number },
  now: number,
): string {
  const root = tree.byId.get(contextId);
  if (!root) return '';
  const ids = subtreeIds(tree, contextId);
  const segments = segmentsIn(entries, tree, range.start, range.end, now).filter((s) => ids.has(s.context.id));
  const sums = totals(tree, segments);
  const rootTotal = sums.byId.get(contextId)?.total ?? 0;

  const isWeek = addDays(range.start, 7) === range.end;
  const label = isWeek
    ? formatWeekRange(range.start)
    : `${formatWeekday(range.start)} ${formatDayMonth(range.start)}`;
  const lines = [`${pathLabel(root)} · ${label} · ${formatDuration(rootTotal)}`];

  const walk = (node: TotalsNode | undefined, indent: string) => {
    for (const child of node?.children ?? []) {
      lines.push(`${indent}${child.context.name}  ${formatDuration(child.total)}`);
      walk(child, `${indent}  `);
    }
  };
  walk(sums.byId.get(contextId), '  ');

  if (isWeek) {
    lines.push('');
    for (let day = range.start; day < range.end; day = addDays(day, 1)) {
      const next = addDays(day, 1);
      const dayTotal = segments.filter((s) => s.start >= day && s.start < next).reduce((sum, s) => sum + s.end - s.start, 0);
      if (dayTotal > 0) lines.push(`${formatWeekday(day)} ${formatDayMonth(day)}  ${formatDuration(dayTotal)}`);
    }
  }
  return lines.join('\n');
}
