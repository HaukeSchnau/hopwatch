// Android's headless task: a tap on the notification, the widget or the Quick Settings tile
// queues a command and wakes the app's JavaScript without opening it (Headless.kt). This
// loads the store, replays the queue, and brings everything that follows the store up to
// date (Slack included), since no root layout mounts here to do it.

import { drainRemote, syncSlack } from '@/core';
import { syncEvening } from '@/core/evening';
import { syncNudge } from '@/core/nudges';
import { initStore } from '@/core/store';

import { syncRunningNotification } from './running-notification';
import { syncShortcuts } from './shortcuts';
import { connectSurfaces, publishSnapshot } from './surfaces';

export async function runSurfacesTask() {
  initStore();
  connectSurfaces();
  drainRemote();
  publishSnapshot();
  await Promise.allSettled([syncRunningNotification(), syncNudge(), syncEvening(), syncShortcuts(), syncSlack()]);
}
