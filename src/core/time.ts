// Local calendar math and duration formatting. Days and weeks follow the device's
// current time zone; weeks start on Monday. Durations are shown as h:mm, never decimals.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Local UTC offset in minutes at an instant (UTC+2 is 120). */
export const offsetAt = (ts: number) => -new Date(ts).getTimezoneOffset();

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Adds calendar days, so DST days keep their 23 or 25 hours. */
export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function startOfWeek(ts: number): number {
  const day = startOfDay(ts);
  const mondayIndex = (new Date(day).getDay() + 6) % 7;
  return addDays(day, -mondayIndex);
}

/** [start, end) of the local day containing `ts`. */
export const dayRange = (ts: number) => {
  const start = startOfDay(ts);
  return { start, end: addDays(start, 1) };
};

/** [start, end) of the Monday-based week containing `ts`. */
export const weekRange = (ts: number) => {
  const start = startOfWeek(ts);
  return { start, end: addDays(start, 7) };
};

export const isSameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);

const MINUS = '−';

/** 36:40, 0:05. Negative values get a real minus sign: −3:20. */
export function formatDuration(ms: number): string {
  const sign = ms < 0 ? MINUS : '';
  const totalMinutes = Math.floor(Math.abs(ms) / MINUTE);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** +1:20 or −3:20, for differences against a target. */
export const formatSignedDuration = (ms: number) => (ms >= 0 ? `+${formatDuration(ms)}` : formatDuration(ms));

/** Hours, minutes and seconds, for live timers that want to animate seconds. */
export function durationParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { hours: Math.floor(total / 3600), minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 24-hour wall clock: 09:05. */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const weekdayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const longDayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

/** Mon */
export const formatWeekday = (ts: number) => weekdayFormat.format(ts);
/** 24 Sep */
export const formatDayMonth = (ts: number) => dayMonthFormat.format(ts);
/** Wednesday 24 September */
export const formatLongDay = (ts: number) => longDayFormat.format(ts);

/** Today, Yesterday, or Mon 22 Sep. */
export function formatRelativeDay(ts: number, now: number): string {
  const day = startOfDay(ts);
  const today = startOfDay(now);
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  return `${formatWeekday(ts)} ${formatDayMonth(ts)}`;
}

/** 22–28 Sep, or 29 Sep – 5 Oct across months. */
export function formatWeekRange(weekStart: number): string {
  const last = addDays(weekStart, 6);
  const a = new Date(weekStart);
  const b = new Date(last);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${formatDayMonth(last)}`;
  return `${formatDayMonth(weekStart)} – ${formatDayMonth(last)}`;
}

/** "just now", "5 min ago", "1:20 ago": for backdating choices. */
export function formatAgo(ms: number): string {
  const minutes = Math.round(ms / MINUTE);
  if (minutes < 1) return 'just now';
  return minutes < 60 ? `${minutes} min ago` : `${formatDuration(ms)} ago`;
}
