// The forgotten-timer nudge: one local notification per running entry, due when the
// entry exceeds its context's nudge threshold. Rescheduled whenever the running entry
// or the tree changes; nothing runs in the background. On Android, nudges have their own
// notification channel, so they can be turned off or tuned on their own.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { coreText } from '@/i18n/core';

import * as db from './db';
import { requestNudgePermission } from './permissions';
import { actions, type HopwatchState, useHopwatch } from './store';
import { formatDuration, MINUTE } from './time';
import { findOpen } from './timeline';

/**
 * The nudge's one notification id. Native code schedules under it too when a tap outside
 * the app switches (remote.ts), so either side replaces the other's pending nudge.
 */
export const NUDGE_ID = 'hopwatch.nudge';

interface Scheduled {
  key: string;
}

let scheduled: Scheduled | null = null;
let queue = Promise.resolve();

/** The Android notification channel for nudges. */
const CHANNEL = 'nudges';

/**
 * Creates the nudge channel, or renames it after a language change. Android 13 and later
 * only show the permission prompt once a channel exists.
 */
async function setUpChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: coreText.nudge.channel,
    description: coreText.nudge.channelDescription,
    // A heads-up banner, silent like the nudge on iOS.
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
  });
}

function desiredNudge(state: HopwatchState) {
  const open = findOpen(state.entries);
  if (!open) return null;
  const context = state.tree.byId.get(open.contextId);
  if (!context) return null;
  const fireAt = open.startUtc + context.nudgeMinutes * MINUTE;
  const emoji = context.glyph ? `${context.glyph} ` : '';
  const title = `${emoji}${coreText.nudge.title(context.name)}`;
  const body = coreText.nudge.body(formatDuration(context.nudgeMinutes * MINUTE));
  // The text is part of the key, so a rename or a new app language reschedules it.
  return { key: `${open.id}@${fireAt}@${title}@${body}`, fireAt, title, body, entryId: open.id };
}

async function sync(state: HopwatchState) {
  const want = desiredNudge(state);
  if ((want?.key ?? null) === (scheduled?.key ?? null)) return;

  // Cancels a native one too, which the meta row doesn't know about.
  await Notifications.cancelScheduledNotificationAsync(NUDGE_ID).catch(() => {});
  scheduled = null;
  db.setMeta('nudge', null);
  if (!want || want.fireAt <= Date.now()) return;

  if (!(await requestNudgePermission())) return;

  await Notifications.scheduleNotificationAsync({
    identifier: NUDGE_ID,
    content: {
      title: want.title,
      body: want.body,
      data: { kind: 'nudge', entryId: want.entryId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(want.fireAt), channelId: CHANNEL },
  });
  scheduled = { key: want.key };
  db.setMeta('nudge', JSON.stringify(scheduled));
}

/** Brings the nudge in line with the store once, for the headless task (headless.ts). */
export async function syncNudge() {
  await setUpChannel();
  await sync(useHopwatch.getState());
}

function isNudge(response: Notifications.NotificationResponse | null) {
  return response?.notification.request.content.data?.kind === 'nudge';
}

/**
 * Starts keeping the nudge in sync with the store and routes taps on a nudge to the
 * stop sheet. Call once from the root layout; returns a cleanup function.
 */
export function startNudges(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  const saved = db.getMeta('nudge');
  const parsed = saved ? (JSON.parse(saved) as Scheduled & { notificationId?: string }) : null;
  // TODO: drop once 1.2.0 has been out a while. Versions up to 1.1.x scheduled the nudge
  // under a random id; cancel that one so it can't fire next to the NUDGE_ID one.
  if (parsed?.notificationId) Notifications.cancelScheduledNotificationAsync(parsed.notificationId).catch(() => {});
  scheduled = parsed && { key: parsed.key };

  // Nudges wait for their channel.
  queue = setUpChannel().catch((error) => console.warn('nudge channel failed', error));
  const enqueue = (state: HopwatchState) => {
    queue = queue.then(() => sync(state)).catch((error) => console.warn('nudge sync failed', error));
  };
  enqueue(useHopwatch.getState());
  const unsubscribe = useHopwatch.subscribe((state, prev) => {
    if (state.entries !== prev.entries || state.tree !== prev.tree) enqueue(state);
  });

  if (isNudge(Notifications.getLastNotificationResponse())) {
    actions.setIntent({ kind: 'stop-sheet' });
    Notifications.clearLastNotificationResponse();
  }
  const responses = Notifications.addNotificationResponseReceivedListener((response) => {
    if (isNudge(response)) actions.setIntent({ kind: 'stop-sheet' });
  });

  return () => {
    unsubscribe();
    responses.remove();
  };
}
