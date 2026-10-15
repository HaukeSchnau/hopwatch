// Public holidays, computed rather than stored, since the Easter-based ones move every
// year. Germany only for now, per state (the ISO 3166-2 code without "DE-"); elsewhere,
// people mark their days off by hand. A holiday on a work day takes that day's share off
// a job-hours target, like a day off.

export const germanStates = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'] as const;
export type GermanState = (typeof germanStates)[number];
export const isGermanState = (value: unknown): value is GermanState =>
  typeof value === 'string' && (germanStates as readonly string[]).includes(value);

export type HolidayId =
  | 'newYear'
  | 'epiphany'
  | 'womensDay'
  | 'goodFriday'
  | 'easterSunday'
  | 'easterMonday'
  | 'labourDay'
  | 'ascension'
  | 'whitSunday'
  | 'whitMonday'
  | 'corpusChristi'
  | 'assumption'
  | 'childrensDay'
  | 'unityDay'
  | 'reformationDay'
  | 'allSaints'
  | 'repentanceDay'
  | 'christmasDay'
  | 'boxingDay';

/** A day as YYYY-MM-DD, from a UTC date (only its calendar fields are used). */
const key = (d: Date) => d.toISOString().slice(0, 10);
const on = (year: number, month: number, day: number) => key(new Date(Date.UTC(year, month - 1, day)));

/** Easter Sunday (Gregorian), by the Meeus/Jones/Butcher algorithm. */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const afterEaster = (year: number, days: number) => key(new Date(easter(year).getTime() + days * 86_400_000));

/** Buß- und Bettag: the Wednesday before 23 November. */
function repentanceDay(year: number): string {
  const nov22 = new Date(Date.UTC(year, 10, 22));
  const back = (nov22.getUTCDay() - 3 + 7) % 7;
  return on(year, 11, 22 - back);
}

/** The states where each regional holiday applies; the rest apply everywhere. */
const regional: Partial<Record<HolidayId, readonly GermanState[]>> = {
  epiphany: ['BW', 'BY', 'ST'],
  womensDay: ['BE', 'MV'],
  // Brandenburg also keeps Easter and Whit Sunday, which only matter for Sunday work days.
  easterSunday: ['BB'],
  whitSunday: ['BB'],
  corpusChristi: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'],
  // In Bavaria only in mostly Catholic communities, which is most of the state (Munich too).
  assumption: ['BY', 'SL'],
  childrensDay: ['TH'],
  reformationDay: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'],
  allSaints: ['BW', 'BY', 'NW', 'RP', 'SL'],
  repentanceDay: ['SN'],
};

/** The public holidays of `year` in a German state, keyed by day (YYYY-MM-DD). */
export function germanHolidays(year: number, state: GermanState): Map<string, HolidayId> {
  const all: [string, HolidayId][] = [
    [on(year, 1, 1), 'newYear'],
    [on(year, 1, 6), 'epiphany'],
    [on(year, 3, 8), 'womensDay'],
    [afterEaster(year, -2), 'goodFriday'],
    [afterEaster(year, 0), 'easterSunday'],
    [afterEaster(year, 1), 'easterMonday'],
    [on(year, 5, 1), 'labourDay'],
    [afterEaster(year, 39), 'ascension'],
    [afterEaster(year, 49), 'whitSunday'],
    [afterEaster(year, 50), 'whitMonday'],
    [afterEaster(year, 60), 'corpusChristi'],
    [on(year, 8, 15), 'assumption'],
    [on(year, 9, 20), 'childrensDay'],
    [on(year, 10, 3), 'unityDay'],
    [on(year, 10, 31), 'reformationDay'],
    [on(year, 11, 1), 'allSaints'],
    [repentanceDay(year), 'repentanceDay'],
    [on(year, 12, 25), 'christmasDay'],
    [on(year, 12, 26), 'boxingDay'],
  ];
  return new Map(all.filter(([, id]) => regional[id]?.includes(state) ?? true));
}
