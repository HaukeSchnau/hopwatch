// Hopwatch's data model. Contexts and entries, plus days off for job hours, shaped for a
// later last-write-wins sync: device-generated UUIDs, updatedAt on every row, soft
// deletes. All timestamps are epoch milliseconds (UTC); days are local YYYY-MM-DD keys.

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ContextId = Brand<string, 'ContextId'>;
export type EntryId = Brand<string, 'EntryId'>;
export type DayOffId = Brand<string, 'DayOffId'>;

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
  /**
   * The weekdays a weekly target is spread over, as bits (Monday is bit 0, see
   * `isWorkday`). Null is a plain weekly target. Set, it's job hours: a day off or a public
   * holiday on one of these days takes that day's share off the target.
   */
  workDays: number | null;
  /** Job hours keep an overtime balance from this day (YYYY-MM-DD) on; null keeps none. */
  balanceSince: string | null;
  /** Where the balance stood when it started, e.g. carried over from the employer's count. */
  balanceStartMinutes: number;
  /** Inherited from the parent, then from DEFAULT_NUDGE_MINUTES. */
  nudgeAfterMinutes: number | null;
  /** The Slack status while it runs; null sets none. Not inherited: only jellies picked for Slack set one. */
  slackStatus: SlackStatus | null;
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

/** A Slack status a jelly sets while it runs. A null emoji is the jelly's own emoji. */
export interface SlackStatus {
  text: string;
  emoji: string | null;
}

export const isSlackStatus = (value: unknown): value is SlackStatus =>
  typeof value === 'object' &&
  value !== null &&
  'text' in value &&
  typeof value.text === 'string' &&
  value.text.trim() !== '' &&
  'emoji' in value &&
  (value.emoji === null || typeof value.emoji === 'string');

/** Why a day is off. Public holidays aren't stored; they're computed (holidays.ts). */
export const dayOffKinds = ['vacation', 'sick', 'other'] as const;
export type DayOffKind = (typeof dayOffKinds)[number];
export const isDayOffKind = (value: unknown): value is DayOffKind =>
  typeof value === 'string' && (dayOffKinds as readonly string[]).includes(value);

/** A whole day off work. It takes its share off every job-hours target (`workDays`). */
export interface DayOff extends SyncFields {
  id: DayOffId;
  /** The local day, YYYY-MM-DD. */
  day: string;
  kind: DayOffKind;
  note: string | null;
}

/** Monday to Friday, the work days a new job-hours target starts with. */
export const MONDAY_TO_FRIDAY = 0b0011111;

/** Whether `workDays` includes `weekday` (0 is Monday, 6 Sunday). */
export const isWorkday = (workDays: number, weekday: number) => (workDays & (1 << weekday)) !== 0;

export const DEFAULT_NUDGE_MINUTES = 180;
/** Entries shorter than this are discarded on stop, switch and trim. */
export const MIN_ENTRY_MS = 30_000;
export const DEFAULT_HUE: Hue = 'gray';
