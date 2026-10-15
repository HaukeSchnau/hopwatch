// The evening check: one optional notification at a time the user picks, sent only when the
// day has gaps worth a look ("Today has 2 gaps"). Tapping it opens the day. Like the nudge,
// it's rescheduled whenever entries, the tree or the setting change, and when the app comes
// back, so its count is as of the last change; nothing runs in the background. Gaps the
// user marked as breaks don't count (see `markBreak`).

import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { coreText } from '@/i18n/core';

import * as db from './db';
import { usePref } from './hooks';
import { requestNudgePermission } from './permissions';
import { type Break, reviewGaps } from './reports';
import { actions, type HopwatchState, type Json, useHopwatch } from './store';
import { addDays, formatDuration, MINUTE, startOfDay } from './time';

/** Minutes after midnight the check comes at; absent means it's off. */
const EVENING = 'evening.at';
/** Breaks the user marked, as [from, to] pairs, kept for two weeks. */
const BREAKS = 'evening.breaks';
const KEEP_BREAKS_DAYS = 14;
const CHANNEL = 'evening';

const parseMinutes = (value: Json) => (typeof value === 'number' && value >= 0 && value < 24 * 60 ? value : undefined);
const parseBreaks = (value: Json): Break[] =>
  Array.isArray(value) ? value.flatMap((b) => (Array.isArray(b) && typeof b[0] === 'number' && typeof b[1] === 'number' ? [[b[0], b[1]] as const] : [])) : [];

/** The evening check's time in minutes after midnight, or null when it's off. */
export const useEveningCheck = () => usePref<number | null>(EVENING, null, parseMinutes);
export const setEveningCheck = (minutes: number | null) => actions.setPref(EVENING, minutes);

/**
 * Marks [from, to] as a break, untracked on purpose, so the evening check doesn't ask about
 * it. Breaks older than two weeks are dropped on the way.
 */
export function markBreak(from: number, to: number) {
  const keepAfter = addDays(startOfDay(Date.now()), -KEEP_BREAKS_DAYS);
  const kept = parseBreaks(useHopwatch.getState().prefs[BREAKS] ?? null).filter(([, end]) => end > keepAfter);
  actions.setPref(BREAKS, [...kept.map(([a, b]) => [a, b]), [from, to]]);
}

interface Scheduled {
  key: string;
  notificationId: string;
}

let scheduled: Scheduled | null = null;
let queue = Promise.resolve();

async function setUpChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: coreText.evening.channel,
    description: coreText.evening.channelDescription,
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
}

/** Today's check, if it's on, still ahead and the day has gaps worth asking about. */
function desiredCheck(state: HopwatchState, now: number) {
  const minutes = parseMinutes(state.prefs[EVENING] ?? null);
  if (minutes === undefined) return null;
  const day = startOfDay(now);
  const fireAt = day + minutes * MINUTE;
  if (fireAt <= now) return null;
  const gaps = reviewGaps(state.entries, state.tree, day, now, parseBreaks(state.prefs[BREAKS] ?? null));
  if (gaps.length === 0) return null;
  const untracked = gaps.reduce((sum, g) => sum + g.end - g.start, 0);
  const title = coreText.evening.title(gaps.length);
  const body = coreText.evening.body(formatDuration(untracked), gaps.length);
  return { key: `${fireAt}@${title}@${body}`, fireAt, title, body, day };
}

async function sync(state: HopwatchState) {
  const want = desiredCheck(state, Date.now());
  if ((want?.key ?? null) === (scheduled?.key ?? null)) return;

  if (scheduled) {
    await Notifications.cancelScheduledNotificationAsync(scheduled.notificationId).catch(() => {});
    scheduled = null;
    db.setMeta('evening', null);
  }
  if (!want) return;
  if (!(await requestNudgePermission())) return;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: { title: want.title, body: want.body, data: { kind: 'evening', day: want.day } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(want.fireAt), channelId: CHANNEL },
  });
  scheduled = { key: want.key, notificationId };
  db.setMeta('evening', JSON.stringify(scheduled));
}

/** Brings the evening check in line with the store once, for the headless task. */
export async function syncEvening() {
  await setUpChannel();
  await sync(useHopwatch.getState());
}

/** The day a tapped evening check is about, or null for any other notification. */
function eveningDay(response: Notifications.NotificationResponse | null): number | null {
  const data = response?.notification.request.content.data;
  return data?.kind === 'evening' && typeof data.day === 'number' ? data.day : null;
}

/**
 * Starts keeping the evening check in sync and routes a tap on it to that day. Call once
 * from the root layout, after `startNudges` (which sets the notification handler).
 */
export function startEveningCheck(): () => void {
  const saved = db.getMeta('evening');
  scheduled = saved ? (JSON.parse(saved) as Scheduled) : null;

  queue = setUpChannel().catch((error) => console.warn('evening channel failed', error));
  const enqueue = () => {
    queue = queue.then(() => sync(useHopwatch.getState())).catch((error) => console.warn('evening sync failed', error));
  };
  enqueue();
  const unsubscribe = useHopwatch.subscribe((state, prev) => {
    if (state.entries !== prev.entries || state.tree !== prev.tree || state.prefs !== prev.prefs) enqueue();
  });
  // A new day needs its own check, scheduled the first time the app comes back.
  const foreground = AppState.addEventListener('change', (status) => status === 'active' && enqueue());

  const tapped = eveningDay(Notifications.getLastNotificationResponse());
  if (tapped !== null) {
    actions.setIntent({ kind: 'day-gaps', day: tapped });
    Notifications.clearLastNotificationResponse();
  }
  const responses = Notifications.addNotificationResponseReceivedListener((response) => {
    const day = eveningDay(response);
    if (day !== null) actions.setIntent({ kind: 'day-gaps', day });
  });

  return () => {
    unsubscribe();
    foreground.remove();
    responses.remove();
  };
}
