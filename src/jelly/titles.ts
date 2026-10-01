// Header titles for day and week navigation. Title and subtitle never repeat each other.

import { formatDayMonth, formatRelativeDay, formatWeekday, formatWeekRange, startOfWeek } from '@/core';

/** "Today" / "Fri 25 Sep", "Yesterday" / "Thu 24 Sep", "Mon" / "22 Sep". */
export function dayTitles(day: number, now: number) {
  const relative = formatRelativeDay(day, now);
  const named = relative === 'Today' || relative === 'Yesterday';
  return {
    title: named ? relative : formatWeekday(day),
    subtitle: named ? `${formatWeekday(day)} ${formatDayMonth(day)}` : formatDayMonth(day),
  };
}

/** "This week" / "21–27 Sep", "Last week" / "14–20 Sep", "7–13 Sep" / "2 weeks ago". */
export function weekTitles(week: number, now: number) {
  const back = Math.round((startOfWeek(now) - week) / (7 * 86_400_000));
  if (back === 0) return { title: 'This week', subtitle: formatWeekRange(week) };
  if (back === 1) return { title: 'Last week', subtitle: formatWeekRange(week) };
  const subtitle = back > 0 ? `${back} weeks ago` : back === -1 ? 'Next week' : `In ${-back} weeks`;
  return { title: formatWeekRange(week), subtitle };
}
