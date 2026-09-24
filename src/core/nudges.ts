// The forgotten-timer nudge: one local notification per running entry, due when the
// entry exceeds its context's nudge threshold. Rescheduled whenever the running entry
// or the tree changes; nothing runs in the background.

import * as Notifications from 'expo-notifications';

import * as db from './db';
import { requestNudgePermission } from './permissions';
import { actions, type StintState, useStint } from './store';
import { formatDuration, MINUTE } from './time';
import { findOpen } from './timeline';

interface Scheduled {
  key: string;
  notificationId: string;
}

let scheduled: Scheduled | null = null;
let queue = Promise.resolve();

function desiredNudge(state: StintState) {
  const open = findOpen(state.entries);
  if (!open) return null;
  const context = state.tree.byId.get(open.contextId);
  if (!context) return null;
  const fireAt = open.startUtc + context.nudgeMinutes * MINUTE;
  return { key: `${open.id}@${fireAt}`, fireAt, context, entryId: open.id };
}

async function sync(state: StintState) {
  const want = desiredNudge(state);
  if ((want?.key ?? null) === (scheduled?.key ?? null)) return;

  if (scheduled) {
    await Notifications.cancelScheduledNotificationAsync(scheduled.notificationId).catch(() => {});
    scheduled = null;
    db.setMeta('nudge', null);
  }
  if (!want || want.fireAt <= Date.now()) return;

  if (!(await requestNudgePermission())) return;

  const emoji = want.context.glyph ? `${want.context.glyph} ` : '';
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji}Still on ${want.context.name}?`,
      body: `It's been running for ${formatDuration(want.context.nudgeMinutes * MINUTE)}. Tap to stop it at the right time.`,
      data: { kind: 'nudge', entryId: want.entryId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(want.fireAt) },
  });
  scheduled = { key: want.key, notificationId };
  db.setMeta('nudge', JSON.stringify(scheduled));
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
  scheduled = saved ? (JSON.parse(saved) as Scheduled) : null;

  const enqueue = (state: StintState) => {
    queue = queue.then(() => sync(state)).catch((error) => console.warn('nudge sync failed', error));
  };
  enqueue(useStint.getState());
  const unsubscribe = useStint.subscribe((state, prev) => {
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
