// Days in route params: `?date=2026-09-24` opens that local day.

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-09-24" for the local day containing `ts`. */
export function dayParam(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Start of the local day named by a `YYYY-MM-DD` param, or null. */
export function parseDayParam(value: string | undefined): number | null {
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}
