import { describe, expect, it } from 'vitest';

import { BACKUP_VERSION, backupPayload, parseBackup } from './backup';
import type { Context, ContextId, DayOff, DayOffId, Entry, EntryId } from './model';

const T0 = Date.UTC(2026, 9, 1, 8, 0);
const HOUR = 3_600_000;

const context = (id: string, parentId: string | null = null): Context => ({
  id: id as ContextId,
  parentId: parentId as ContextId | null,
  name: id,
  color: 'pink',
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  workDays: null,
  balanceSince: null,
  balanceStartMinutes: 0,
  nudgeAfterMinutes: null,
  archivedAt: null,
  createdAt: T0,
  updatedAt: T0,
  deletedAt: null,
});

const entry = (id: string, contextId: string, start: number, end: number | null): Entry => ({
  id: id as EntryId,
  contextId: contextId as ContextId,
  startUtc: start,
  startOffsetMinutes: 120,
  endUtc: end,
  endOffsetMinutes: end === null ? null : 120,
  note: null,
  createdAt: start,
  updatedAt: start,
  deletedAt: null,
});

/** An export file as the app writes it, round-tripped through JSON. */
const file = (contexts: Context[], entries: Entry[], prefs = {}, daysOff: DayOff[] = []) =>
  JSON.parse(JSON.stringify(backupPayload({ contexts, entries, daysOff, prefs }, new Date(T0))));

const work = [context('work'), context('deep', 'work')];

describe('parseBackup', () => {
  it('reads back what the export writes', () => {
    const entries = [entry('a', 'work', T0, T0 + HOUR), entry('b', 'deep', T0 + HOUR, null)];
    const prefs = { 'jelly.look.deep': { body: 'drop' }, 'jelly.sounds': false };
    const result = parseBackup(file(work, entries, prefs));
    expect(result).toEqual({ ok: true, backup: { exportedAt: T0, contexts: work, entries, daysOff: [], prefs } });
  });

  it('carries job hours: work days, the balance and days off', () => {
    const job = [{ ...context('work'), weeklyTargetMinutes: 40 * 60, workDays: 0b0011111, balanceSince: '2026-01-01', balanceStartMinutes: 150 }];
    const daysOff: DayOff[] = [
      { id: 'o1' as DayOffId, day: '2026-09-21', kind: 'vacation', note: null, createdAt: T0, updatedAt: T0, deletedAt: null },
    ];
    const result = parseBackup(file(job, [], {}, daysOff));
    expect(result.ok && [result.backup.contexts, result.backup.daysOff]).toEqual([job, daysOff]);
  });

  it('reads version 2 files as having no job hours', () => {
    const v2 = { ...file(work, []), schemaVersion: 2 };
    for (const c of v2.contexts) for (const key of ['workDays', 'balanceSince', 'balanceStartMinutes']) delete c[key];
    delete v2.daysOff;
    const result = parseBackup(v2);
    expect(result.ok && result.backup.contexts).toEqual(work);
    expect(result.ok && result.backup.daysOff).toEqual([]);
  });

  it('restores exports from before the rename to Hopwatch', () => {
    expect(parseBackup({ ...file(work, []), app: 'stint' }).ok).toBe(true);
  });

  it('accepts the Stint Five format without prefs', () => {
    const { prefs: _, ...v1 } = { ...file(work, []), schemaVersion: 1 };
    const result = parseBackup(v1);
    expect(result.ok && result.backup.prefs).toEqual({});
  });

  it('rejects files that would break the timeline', () => {
    const overlapping = [entry('a', 'work', T0, T0 + HOUR), entry('b', 'deep', T0 + HOUR / 2, null)];
    expect(parseBackup(file(work, overlapping))).toEqual({ ok: false, reason: 'Entries overlap.' });
    const twoOpen = [entry('a', 'work', T0, null), entry('b', 'deep', T0 + HOUR, null)];
    expect(parseBackup(file(work, twoOpen)).ok).toBe(false);
    const orphan = [entry('a', 'gone', T0, null)];
    expect(parseBackup(file(work, orphan)).ok).toBe(false);
  });

  it('ignores overlaps between deleted entries', () => {
    const entries = [entry('a', 'work', T0, T0 + HOUR), { ...entry('b', 'work', T0, null), deletedAt: T0 }];
    expect(parseBackup(file(work, entries)).ok).toBe(true);
  });

  it('names the damaged row', () => {
    const broken = file(work, []);
    broken.contexts[1].name = 42;
    expect(parseBackup(broken)).toEqual({ ok: false, reason: 'Jelly 2 in the file is damaged.' });
  });

  it('rejects other files and newer formats', () => {
    expect(parseBackup({ hello: 'world' }).ok).toBe(false);
    expect(parseBackup(null).ok).toBe(false);
    const newer = parseBackup({ ...file(work, []), schemaVersion: BACKUP_VERSION + 1 });
    expect(!newer.ok && newer.reason).toMatch(/newer version/);
  });
});
