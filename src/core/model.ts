// Stint's data model. Two tables, contexts and entries, shaped for a later
// last-write-wins sync: device-generated UUIDs, updatedAt on every row, soft deletes.
// All timestamps are epoch milliseconds (UTC).

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ContextId = Brand<string, 'ContextId'>;
export type EntryId = Brand<string, 'EntryId'>;

/**
 * Colors are stored as hue keys, not hex values, so the UI maps them onto its own tuned
 * palette (light and dark) and can retune it without touching data. `defaultHueHex` is
 * the neutral fallback, used in exports.
 */
export const hues = [
  'red',
  'orange',
  'amber',
  'lime',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'violet',
  'pink',
  'gray',
] as const;
export type Hue = (typeof hues)[number];

export const defaultHueHex = {
  red: '#F2555A',
  orange: '#FF8A3D',
  amber: '#F5B82E',
  lime: '#9ACD32',
  green: '#34C77B',
  teal: '#1FB5A8',
  cyan: '#2EC4E6',
  blue: '#3D8BFD',
  indigo: '#6366F1',
  violet: '#9B5CF6',
  pink: '#EC5FA8',
  gray: '#8E8E93',
} satisfies Record<Hue, string>;

export const isHue = (value: unknown): value is Hue =>
  typeof value === 'string' && (hues as readonly string[]).includes(value);

export interface SyncFields {
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Context extends SyncFields {
  id: ContextId;
  /** Null for a root node; depth is unlimited. */
  parentId: ContextId | null;
  name: string;
  /** Inherited from the parent when null. */
  color: Hue | null;
  /** Inherited from the parent when null. */
  emoji: string | null;
  /** Null means not pinned. Pinned tiles keep fixed slots in the grid. */
  pinPosition: number | null;
  /** Order among siblings. */
  sortOrder: number;
  /** Applies to the whole subtree. */
  weeklyTargetMinutes: number | null;
  /** Inherited from the parent, then from DEFAULT_NUDGE_MINUTES. */
  nudgeAfterMinutes: number | null;
  /** Archived nodes leave the pickers and stay in history and reports. */
  archivedAt: number | null;
}

export interface Entry extends SyncFields {
  id: EntryId;
  contextId: ContextId;
  startUtc: number;
  /** Local UTC offset at the time of recording, in minutes (UTC+2 is 120). */
  startOffsetMinutes: number;
  /** Null means the entry is running. */
  endUtc: number | null;
  endOffsetMinutes: number | null;
  note: string | null;
}

export const DEFAULT_NUDGE_MINUTES = 180;
/** Entries shorter than this are discarded on stop, switch and trim. */
export const MIN_ENTRY_MS = 30_000;
export const DEFAULT_HUE: Hue = 'gray';
