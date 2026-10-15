import { describe, expect, it } from 'vitest';

import { germanHolidays } from './holidays';

describe('German public holidays', () => {
  it('moves the Easter-based ones with Easter', () => {
    const ni2026 = germanHolidays(2026, 'NI');
    expect(ni2026.get('2026-04-03')).toBe('goodFriday');
    expect(ni2026.get('2026-04-06')).toBe('easterMonday');
    expect(ni2026.get('2026-05-14')).toBe('ascension');
    expect(ni2026.get('2026-05-25')).toBe('whitMonday');
    expect(germanHolidays(2027, 'NI').get('2027-03-29')).toBe('easterMonday');
    expect(germanHolidays(2025, 'NI').get('2025-04-21')).toBe('easterMonday');
  });

  it('keeps regional holidays to their states', () => {
    expect(germanHolidays(2026, 'BY').get('2026-06-04')).toBe('corpusChristi');
    expect(germanHolidays(2026, 'NI').has('2026-06-04')).toBe(false);
    expect(germanHolidays(2026, 'NI').get('2026-10-31')).toBe('reformationDay');
    expect(germanHolidays(2026, 'BY').has('2026-10-31')).toBe(false);
    expect(germanHolidays(2026, 'BE').get('2026-03-08')).toBe('womensDay');
  });

  it('finds Buß- und Bettag, the Wednesday before 23 November, in Saxony only', () => {
    expect(germanHolidays(2026, 'SN').get('2026-11-18')).toBe('repentanceDay');
    expect(germanHolidays(2025, 'SN').get('2025-11-19')).toBe('repentanceDay');
    expect([...germanHolidays(2026, 'BE').values()]).not.toContain('repentanceDay');
  });

  it('gives every state the national ones', () => {
    for (const state of ['HH', 'BW', 'TH'] as const) {
      const days = germanHolidays(2026, state);
      expect(days.get('2026-10-03')).toBe('unityDay');
      expect(days.get('2026-12-26')).toBe('boxingDay');
    }
    expect(germanHolidays(2026, 'NI').size).toBe(10);
  });
});
