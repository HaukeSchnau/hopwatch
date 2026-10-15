// Job hours: a weekly target spread over a context's work days, where each day off or
// public holiday on a work day takes that day's share off. Days off apply to every
// job-hours target at once; a context without `workDays` keeps a plain weekly target.

import { type GermanState, germanHolidays, type HolidayId } from './holidays';
import { type Context, type DayOff, isWorkday } from './model';
import { addDays, dayKey, MINUTE, weekdayOf } from './time';

/** Whether a day (YYYY-MM-DD) is off work: marked off, or a public holiday. */
export type OffDays = (day: string) => boolean;

export const noOffDays: OffDays = () => false;

/** The public holiday on `day` in `region`, or null. */
export function holidayOn(day: string, region: GermanState | null): HolidayId | null {
  if (!region) return null;
  return germanHolidays(Number(day.slice(0, 4)), region).get(day) ?? null;
}

/** Days off work: the ones marked off, plus the public holidays of `region`. */
export function offDaysOf(daysOff: readonly DayOff[], region: GermanState | null): OffDays {
  const marked = new Set(daysOff.filter((o) => o.deletedAt === null).map((o) => o.day));
  const holidays = new Map<number, ReadonlyMap<string, HolidayId>>();
  return (day) => {
    if (marked.has(day)) return true;
    if (!region) return false;
    const year = Number(day.slice(0, 4));
    if (!holidays.has(year)) holidays.set(year, germanHolidays(year, region));
    return holidays.get(year)!.has(day);
  };
}

type JobHours = Pick<Context, 'weeklyTargetMinutes' | 'workDays'>;

/** Whether a context's target is job hours: a weekly target spread over work days. */
export const isJobHours = (c: JobHours): c is { weeklyTargetMinutes: number; workDays: number } =>
  c.weeklyTargetMinutes !== null && c.workDays !== null && c.workDays !== 0;

/** A job-hours target's share of the day starting at `dayStart`: zero on a day off. */
export function dailyTarget(c: JobHours, dayStart: number, offDays: OffDays): number {
  if (!isJobHours(c)) return 0;
  const weekday = weekdayOf(dayStart);
  if (!isWorkday(c.workDays, weekday) || offDays(dayKey(dayStart))) return 0;
  const workdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => isWorkday(c.workDays, d)).length;
  return (c.weeklyTargetMinutes * MINUTE) / workdays;
}

/**
 * A context's target for the week starting `weekStart`: the plain weekly target, or for
 * job hours the sum of its daily shares, with how many work days were off.
 */
export function weekTarget(c: JobHours, weekStart: number, offDays: OffDays): { target: number; daysOff: number } {
  if (!isJobHours(c)) return { target: (c.weeklyTargetMinutes ?? 0) * MINUTE, daysOff: 0 };
  let target = 0;
  let daysOff = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    if (!isWorkday(c.workDays, weekdayOf(day))) continue;
    if (offDays(dayKey(day))) daysOff++;
    else target += dailyTarget(c, day, offDays);
  }
  return { target, daysOff };
}
