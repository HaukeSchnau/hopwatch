// SQLite persistence. The store keeps every live row in memory and writes changed
// rows through here synchronously; personal-scale data makes that cheap.

import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import { type Context, type ContextId, type Entry, type EntryId, isHue } from './model';

/**
 * Schema steps: step i brings a database from `user_version` i to i + 1, in one
 * transaction. Append new steps; never edit a released one, since phones already ran it.
 */
const migrations: readonly string[] = [
  `
CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  color TEXT,
  emoji TEXT,
  pin_position INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  weekly_target_minutes INTEGER,
  nudge_after_minutes INTEGER,
  archived_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  context_id TEXT NOT NULL,
  start_utc INTEGER NOT NULL,
  start_offset_minutes INTEGER NOT NULL,
  end_utc INTEGER,
  end_offset_minutes INTEGER,
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX IF NOT EXISTS entries_start ON entries (start_utc);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`,
];

interface ContextRow {
  id: string;
  parent_id: string | null;
  name: string;
  color: string | null;
  emoji: string | null;
  pin_position: number | null;
  sort_order: number;
  weekly_target_minutes: number | null;
  nudge_after_minutes: number | null;
  archived_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

interface EntryRow {
  id: string;
  context_id: string;
  start_utc: number;
  start_offset_minutes: number;
  end_utc: number | null;
  end_offset_minutes: number | null;
  note: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

const toContext = (r: ContextRow): Context => ({
  id: r.id as ContextId,
  parentId: r.parent_id as ContextId | null,
  name: r.name,
  color: isHue(r.color) ? r.color : null,
  emoji: r.emoji,
  pinPosition: r.pin_position,
  sortOrder: r.sort_order,
  weeklyTargetMinutes: r.weekly_target_minutes,
  nudgeAfterMinutes: r.nudge_after_minutes,
  archivedAt: r.archived_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

const toEntry = (r: EntryRow): Entry => ({
  id: r.id as EntryId,
  contextId: r.context_id as ContextId,
  startUtc: r.start_utc,
  startOffsetMinutes: r.start_offset_minutes,
  endUtc: r.end_utc,
  endOffsetMinutes: r.end_offset_minutes,
  note: r.note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
});

let db: SQLiteDatabase | null = null;

function open(): SQLiteDatabase {
  if (db) return db;
  db = openDatabaseSync('stint.db');
  db.execSync('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

function migrate(d: SQLiteDatabase) {
  const { user_version } = d.getFirstSync<{ user_version: number }>('PRAGMA user_version') ?? { user_version: 0 };
  for (let version = user_version; version < migrations.length; version++) {
    d.withTransactionSync(() => {
      d.execSync(migrations[version]);
      d.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

/** Every live context and entry, entries sorted by start. */
export function loadAll(): { contexts: Context[]; entries: Entry[] } {
  const d = open();
  const contexts = d.getAllSync<ContextRow>('SELECT * FROM contexts WHERE deleted_at IS NULL').map(toContext);
  const entries = d
    .getAllSync<EntryRow>('SELECT * FROM entries WHERE deleted_at IS NULL ORDER BY start_utc')
    .map(toEntry);
  return { contexts, entries };
}

/** Everything, soft-deleted rows included, for the JSON export. */
export function dumpAll(): { contexts: Context[]; entries: Entry[] } {
  const d = open();
  return {
    contexts: d.getAllSync<ContextRow>('SELECT * FROM contexts').map(toContext),
    entries: d.getAllSync<EntryRow>('SELECT * FROM entries ORDER BY start_utc').map(toEntry),
  };
}

export function writeRows(rows: { contexts?: readonly Context[]; entries?: readonly Entry[] }): void {
  const d = open();
  d.withTransactionSync(() => {
    for (const c of rows.contexts ?? []) {
      d.runSync(
        `INSERT OR REPLACE INTO contexts (id, parent_id, name, color, emoji, pin_position, sort_order,
          weekly_target_minutes, nudge_after_minutes, archived_at, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c.id,
        c.parentId,
        c.name,
        c.color,
        c.emoji,
        c.pinPosition,
        c.sortOrder,
        c.weeklyTargetMinutes,
        c.nudgeAfterMinutes,
        c.archivedAt,
        c.createdAt,
        c.updatedAt,
        c.deletedAt,
      );
    }
    for (const e of rows.entries ?? []) {
      d.runSync(
        `INSERT OR REPLACE INTO entries (id, context_id, start_utc, start_offset_minutes, end_utc,
          end_offset_minutes, note, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        e.id,
        e.contextId,
        e.startUtc,
        e.startOffsetMinutes,
        e.endUtc,
        e.endOffsetMinutes,
        e.note,
        e.createdAt,
        e.updatedAt,
        e.deletedAt,
      );
    }
  });
}

export function getMeta(key: string): string | null {
  return open().getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', key)?.value ?? null;
}

/** Every meta row whose key starts with `prefix`. */
export function metaWithPrefix(prefix: string): { key: string; value: string }[] {
  return open().getAllSync<{ key: string; value: string }>(
    'SELECT key, value FROM meta WHERE substr(key, 1, length(?1)) = ?1',
    prefix,
  );
}

export function setMeta(key: string, value: string | null): void {
  if (value === null) open().runSync('DELETE FROM meta WHERE key = ?', key);
  else open().runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
}

/** Hard-deletes all contexts and entries. Settings in meta survive. */
export function eraseAll(): void {
  open().execSync('DELETE FROM entries; DELETE FROM contexts;');
}
