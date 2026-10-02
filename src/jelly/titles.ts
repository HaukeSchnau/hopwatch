// Header titles for day and week navigation. Title and subtitle never repeat each other.

import { addDays, formatDayMonth, formatRelativeDay, formatWeekday, formatWeekRange, isSameDay, startOfWeek } from '@/core';
import { shellText } from '@/i18n/shell';

/** "Today" / "Fri 25 Sep", "Yesterday" / "Thu 24 Sep", "Mon" / "22 Sep". */
export function dayTitles(day: number, now: number) {
  const named = isSameDay(day, now) || isSameDay(day, addDays(now, -1));
  return {
    title: named ? formatRelativeDay(day, now) : formatWeekday(day),
    subtitle: named ? `${formatWeekday(day)} ${formatDayMonth(day)}` : formatDayMonth(day),
  };
}

/** "This week" / "21–27 Sep", "Last week" / "14–20 Sep", "7–13 Sep" / "2 weeks ago". */
export function weekTitles(week: number, now: number) {
  const { weeks } = shellText;
  const back = Math.round((startOfWeek(now) - week) / (7 * 86_400_000));
  if (back === 0) return { title: weeks.this, subtitle: formatWeekRange(week) };
  if (back === 1) return { title: weeks.last, subtitle: formatWeekRange(week) };
  const subtitle = back > 0 ? weeks.ago(back) : back === -1 ? weeks.next : weeks.ahead(-back);
  return { title: formatWeekRange(week), subtitle };
}
