// The day-off pill under the Day dial: whether the day is off work and why (a day off the
// user marked, or a public holiday), and marking it. It only shows once some jelly counts
// days off (job hours), or when the day is off anyway.

import { actions, dayKey, type DayOffKind, isJobHours, useDayOff, useTree } from '@/core';
import { dayText } from '@/i18n/day';

import { buzz } from '../feedback';

const s = dayText.dayOff;

export const dayOffEmoji: Record<DayOffKind, string> = { vacation: '🏖️', sick: '🤒', other: '📅' };

export function useDayOffPill(dayStart: number) {
  const tree = useTree();
  const { kind, holiday } = useDayOff(dayStart);
  const jobHours = tree.ordered.some((c) => !c.hidden && isJobHours(c));
  const label = holiday ? `🎉 ${dayText.holidays[holiday]}` : kind ? `${dayOffEmoji[kind]} ${s[kind]}` : s.ask;
  return {
    shown: jobHours || kind !== null || holiday !== null,
    off: kind !== null || holiday !== null,
    label,
    kind,
    set: (next: DayOffKind | null) => {
      buzz.tick();
      actions.setDayOff(dayKey(dayStart), next);
    },
  };
}

/** The menu's choices: the kinds of day off, then back to a workday once one is set. */
export const dayOffChoices = (kind: DayOffKind | null) => [
  { kind: 'vacation' as const, title: `${dayOffEmoji.vacation} ${s.vacation}` },
  { kind: 'sick' as const, title: `${dayOffEmoji.sick} ${s.sick}` },
  { kind: 'other' as const, title: `${dayOffEmoji.other} ${s.otherItem}` },
  ...(kind ? [{ kind: null, title: s.workday }] : []),
];
