// The JSON backup format, written by the export and read back by the restore. Pure, so
// the parser is tested without React Native.
//
// Version 1 (Stint Five) has contexts and entries. Version 2 adds the device's preferences,
// which hold each jelly's look. Soft-deleted rows travel too, for a later sync.

import { coreText } from '@/i18n/core';

import { type Context, type ContextId, defaultHueHex, type Entry, type EntryId, isHue } from './model';
import type { Json } from './store';

const text = coreText.backup;

export const BACKUP_VERSION = 2;

export interface Backup {
  exportedAt: number;
  contexts: Context[];
  entries: Entry[];
  prefs: Record<string, Json>;
}

/** The export file's contents. `colorHex` is only for people reading the JSON. */
export function backupPayload(data: Omit<Backup, 'exportedAt'>, exportedAt: Date) {
  return {
    app: 'stint',
    schemaVersion: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    contexts: data.contexts.map((c) => ({ ...c, colorHex: c.color ? defaultHueHex[c.color] : null })),
    entries: data.entries,
    prefs: data.prefs,
  };
}

/** Reads one field; `undefined` means the value is invalid. */
type Read<T> = (value: unknown) => T | undefined;
type Shape = Record<string, Read<unknown>>;
type Parsed<S extends Shape> = { [K in keyof S]: Exclude<ReturnType<S[K]>, undefined> };

const num: Read<number> = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str: Read<string> = (v) => (typeof v === 'string' ? v : undefined);
const id = <T extends string>(): Read<T> => (v) => (typeof v === 'string' && v.length > 0 ? (v as T) : undefined);
const nullable =
  <T,>(read: Read<T>): Read<T | null> =>
  (v) =>
    v === null || v === undefined ? null : read(v);

function readObject<S extends Shape>(shape: S, value: unknown): Parsed<S> | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, read] of Object.entries(shape)) {
    const field = read(record[key]);
    if (field === undefined) return undefined;
    out[key] = field;
  }
  return out as Parsed<S>;
}

const contextShape = {
  id: id<ContextId>(),
  parentId: nullable(id<ContextId>()),
  name: str,
  // An unknown hue falls back to the parent's color rather than failing the restore.
  color: (v: unknown) => (isHue(v) ? v : null),
  emoji: nullable(str),
  pinPosition: nullable(num),
  sortOrder: num,
  weeklyTargetMinutes: nullable(num),
  nudgeAfterMinutes: nullable(num),
  archivedAt: nullable(num),
  createdAt: num,
  updatedAt: num,
  deletedAt: nullable(num),
} satisfies Shape;

const entryShape = {
  id: id<EntryId>(),
  contextId: id<ContextId>(),
  startUtc: num,
  startOffsetMinutes: num,
  endUtc: nullable(num),
  endOffsetMinutes: nullable(num),
  note: nullable(str),
  createdAt: num,
  updatedAt: num,
  deletedAt: nullable(num),
} satisfies Shape;

const isJsonObject = (v: unknown): v is { [key: string]: Json } =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(isJson);
const isJson = (v: unknown): v is Json =>
  v === null ||
  ['string', 'number', 'boolean'].includes(typeof v) ||
  (Array.isArray(v) && v.every(isJson)) ||
  isJsonObject(v);

/** Every row of `list` read with `shape`, or the index of the first bad one. */
function readAll<S extends Shape>(shape: S, list: unknown[]): Parsed<S>[] | number {
  const rows: Parsed<S>[] = [];
  for (const [i, item] of list.entries()) {
    const row = readObject(shape, item);
    if (!row) return i;
    rows.push(row);
  }
  return rows;
}

/** Why live entries break the timeline's rules, or null when they don't. */
function timelineProblem(entries: readonly Entry[], contextIds: ReadonlySet<ContextId>): string | null {
  const live = entries.filter((e) => e.deletedAt === null).sort((a, b) => a.startUtc - b.startUtc);
  for (const [i, e] of live.entries()) {
    if (!contextIds.has(e.contextId)) return text.missingContext;
    if (e.endUtc !== null && e.endUtc < e.startUtc) return text.endsBeforeStart;
    const next = live[i + 1];
    if (next && (e.endUtc === null || e.endUtc > next.startUtc)) return text.overlap;
  }
  return null;
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; reason: string };

/** Checks a parsed export file before a restore replaces everything with it. */
export function parseBackup(json: unknown): ParseResult {
  const fail = (reason: string): ParseResult => ({ ok: false, reason });
  if (typeof json !== 'object' || json === null) return fail(text.notAnExport);
  const file = json as Record<string, unknown>;
  if (file.app !== 'stint') return fail(text.notAnExport);
  const version = file.schemaVersion;
  if (typeof version === 'number' && version > BACKUP_VERSION) {
    return fail(text.newer);
  }
  if (version !== 1 && version !== BACKUP_VERSION) return fail(text.notAnExport);
  if (!Array.isArray(file.contexts) || !Array.isArray(file.entries)) return fail(text.notAnExport);

  const contexts = readAll(contextShape, file.contexts);
  if (typeof contexts === 'number') return fail(text.damagedContext(contexts + 1));
  const entries = readAll(entryShape, file.entries);
  if (typeof entries === 'number') return fail(text.damagedEntry(entries + 1));

  const contextIds = new Set(contexts.map((c) => c.id));
  if (contextIds.size !== contexts.length) return fail(text.contextTwice);
  if (new Set(entries.map((e) => e.id)).size !== entries.length) return fail(text.entryTwice);
  if (contexts.some((c) => c.parentId !== null && !contextIds.has(c.parentId))) {
    return fail(text.missingParent);
  }
  const problem = timelineProblem(entries, contextIds);
  if (problem) return fail(problem);

  const prefs = file.prefs ?? {};
  if (!isJsonObject(prefs)) return fail(text.damagedPrefs);
  const exportedAt = typeof file.exportedAt === 'string' ? Date.parse(file.exportedAt) : Number.NaN;

  return {
    ok: true,
    backup: { exportedAt: Number.isNaN(exportedAt) ? 0 : exportedAt, contexts, entries, prefs },
  };
}
