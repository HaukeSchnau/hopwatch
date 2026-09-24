// The Almanac writes numbers out where prose reads better than figures: target
// sentences ("three hours twenty short") and datelines. Figures stay h:mm elsewhere.

import { HOUR, MINUTE } from '@/core';

const ones = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** 42 → "forty-two". Falls back to digits from 100 on. */
export function numberWord(n: number): string {
  if (n < 0 || n >= 100 || !Number.isInteger(n)) return String(n);
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? `-${ones[n % 10]}` : '');
}

/** 3:20 → "three hours twenty", 1:00 → "an hour", 0:40 → "forty minutes". */
export function spellDuration(ms: number): string {
  const total = Math.round(Math.abs(ms) / MINUTE);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return m === 1 ? 'a minute' : `${numberWord(m)} minutes`;
  const hours = h === 1 ? 'an hour' : `${numberWord(h)} hours`;
  if (m === 0) return hours;
  return `${h === 1 ? 'one hour' : hours} ${numberWord(m)}`;
}

/** "three hours twenty short", "forty minutes over", "right on target". */
export function targetVerdict(diff: number): string {
  if (Math.abs(diff) < MINUTE) return 'right on target';
  return `${spellDuration(diff)} ${diff < 0 ? 'short' : 'over'}`;
}

/** ISO week number, for the dateline. */
export function isoWeek(ts: number): number {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

/** Day of the year, printed as the edition number. */
export function dayOfYear(ts: number): number {
  const d = new Date(ts);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime() - (d.getTimezoneOffset() - start.getTimezoneOffset()) * MINUTE) / (24 * HOUR));
}

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

/** "Thursday, 25 September" */
export const formatDateline = (ts: number) => {
  const parts = longDate.formatToParts(ts);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const rest = parts
    .filter((p) => p.type === 'day' || p.type === 'month')
    .map((p) => p.value)
    .join(' ');
  return `${weekday}, ${rest}`;
};

/** "September 2026" */
export const formatMonthYear = (ts: number) => monthYear.format(ts);

/** A list in prose: "Dog", "Dog and Lunch", "Dog, Lunch and Stint". */
export function proseList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
