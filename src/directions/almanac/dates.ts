// Days travel through routes as local calendar dates, e.g. ?date=2026-09-24.

import { startOfDay } from '@/core';

const pad = (n: number) => String(n).padStart(2, '0');

/** 2026-09-24 for the local day containing `ts`. */
export function dayParam(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local midnight of a "2026-09-24" param, or today's when missing or malformed. */
export function parseDayParam(value: string | undefined, now = Date.now()): number {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return startOfDay(now);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
}
