import { describe, expect, it } from 'vitest';

import type { Context, ContextId, Entry, EntryId } from './model';
import { addDays, HOUR, MINUTE, startOfWeek } from './time';
import { buildTree } from './tree';
import { checkSummary, spoken, weekFacts } from './week-facts';

const context = (id: string, parentId: string | null, extra: Partial<Context> = {}): Context => ({
  id: id as ContextId,
  parentId: parentId as ContextId | null,
  name: id,
  color: null,
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  nudgeAfterMinutes: null,
  archivedAt: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...extra,
});

let n = 0;
const entry = (contextId: string, start: number, minutes: number): Entry => ({
  id: `e${n++}` as EntryId,
  contextId: contextId as ContextId,
  startUtc: start,
  startOffsetMinutes: 0,
  endUtc: start + minutes * MINUTE,
  endOffsetMinutes: 0,
  note: null,
  createdAt: start,
  updatedAt: start,
  deletedAt: null,
});

const tree = buildTree([
  context('Job', null, { weeklyTargetMinutes: 40 * 60 }),
  context('Deep work', 'Job'),
  context('Meetings', 'Job'),
  context('Side projects', null, { weeklyTargetMinutes: 6 * 60 }),
  context('Household', null),
]);

// A Monday at local midnight, whatever the test machine's time zone.
const monday = startOfWeek(new Date(2026, 8, 21, 12).getTime());
const at = (day: number, hour: number) => addDays(monday, day) + hour * HOUR;

/** Five workdays of `jobHours` Deep work plus an hour of Meetings, from 9 am. */
const workweek = (weekStart: number, jobHours: number[]) =>
  jobHours.flatMap((hours, day) => [
    entry('Deep work', addDays(weekStart, day) + 9 * HOUR, hours * 60),
    entry('Meetings', addDays(weekStart, day) + 9 * HOUR + hours * HOUR, 60),
  ]);

describe('spoken', () => {
  it('rounds durations the way people say them', () => {
    expect(spoken(22 * MINUTE)).toBe('20 minutes');
    expect(spoken(57 * MINUTE)).toBe('1 hour');
    expect(spoken(80 * MINUTE)).toBe('almost an hour and a half');
    expect(spoken(112 * MINUTE)).toBe('almost 2 hours');
    expect(spoken(6 * HOUR + 32 * MINUTE)).toBe('6 and a half hours');
    expect(spoken(38 * HOUR + 20 * MINUTE)).toBe('just over 38 hours');
    expect(spoken(47 * HOUR + 3 * MINUTE)).toBe('47 hours');
  });
});

describe('weekFacts', () => {
  it('says nothing about a week with almost no data', () => {
    expect(weekFacts([entry('Household', at(2, 18), 90)], tree, monday, addDays(monday, 8))).toBeNull();
  });

  it('sums up a finished week in three facts, most important first', () => {
    const entries = [
      ...workweek(addDays(monday, -7), [7, 7, 7, 7, 7]),
      ...workweek(monday, [7, 10, 7, 6, 6]),
      entry('Side projects', at(5, 10), 120),
    ];
    expect(weekFacts(entries, tree, monday, addDays(monday, 9))).toEqual({
      over: true,
      span: null,
      facts: [
        'You tracked 43 hours, about the same as the week before.',
        'Job got 41 hours, past its target of 40 hours.',
        'Tuesday was the busiest day, with 11 hours, mostly Deep work.',
      ],
    });
  });

  it('compares a running week with last week at the same moment and checks target pace', () => {
    const entries = [...workweek(addDays(monday, -7), [8, 8, 8, 8, 8]), ...workweek(monday, [9, 9, 9])];
    // Wednesday evening: last week had 27 hours by now, this week 30.
    expect(weekFacts(entries, tree, monday, at(2, 20))).toEqual({
      over: false,
      span: 'Monday to Wednesday',
      facts: [
        'You tracked 30 hours so far, 3 hours more than at this point last week.',
        'Job got 30 hours so far, on track for its target of 40 hours.',
        'Your longest stretch was 9 hours of Deep work on Monday.',
      ],
    });
    // Behind pace, the fact says what's still needed instead.
    const slow = weekFacts([entry('Deep work', at(0, 9), 300)], tree, monday, at(2, 20));
    expect(slow?.facts[1]).toBe('Job got 5 hours so far, with 35 hours to go for its target of 40 hours.');
  });

  it('picks late evenings as the notable thing', () => {
    const entries = [...workweek(monday, [6, 6, 6, 6, 6]), entry('Side projects', at(1, 21.5), 90), entry('Side projects', at(3, 22), 60)];
    expect(weekFacts(entries, tree, monday, addDays(monday, 7))?.facts).toContain(
      'You tracked time after 10 pm on 2 days (Tuesday and Thursday), all Side projects.',
    );
  });
});

describe('checkSummary', () => {
  const week = {
    over: true,
    span: null,
    facts: ['You tracked just over 42 hours.', 'Job got 41 hours and met its target of 40 hours.', 'Tuesday was the busiest day, with 11 hours.', 'Side projects missed its target of 6 hours by 4 and a half hours.'],
  };

  it('accepts numbers from the facts, in digits or words', () => {
    expect(checkSummary('A big Job week: 41 hours, past your forty. Tuesday was the busiest with eleven hours.', week)).toBeNull();
    expect(checkSummary('Side projects fell four and a half hours short of six.', week)).toBeNull();
  });

  it('turns down invented numbers and days', () => {
    expect(checkSummary('You tracked 42 hours, 12% more than usual.', week)).toBe('numbers not in the facts: 12');
    expect(checkSummary('Side projects got 1.5 hours this week, nice.', week)).toBe('numbers not in the facts: 1.5');
    expect(checkSummary('Wednesday was your busiest day of the week.', week)).toBe('days not in the facts: wednesday');
  });

  it('turns down empty, rambling or questioning answers', () => {
    expect(checkSummary('Nice.', week)).toMatch(/^length/);
    expect(checkSummary('Busy week. '.repeat(50), week)).toMatch(/^length/);
    expect(checkSummary('You tracked 41 hours for Job. Steady progress, right?', week)).toBe('a question');
  });
});
