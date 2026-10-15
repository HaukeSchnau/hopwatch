// Android's counterpart of the Live Activity (live-activity.ts): a silent, ongoing
// notification for the running entry. It shows the jelly, a system chronometer counting up
// from the start, and buttons for hopwatch://stop and hopwatch://resume. Posted while an
// entry runs, updated on a switch or an edit, removed on stop, and posted again on launch
// and on every return to the foreground. That brings it back after a force stop, a swipe
// (Android 14 and later let people dismiss it) or a newly granted permission.
//
// The buttons switch without opening the app: each carries a tap made when the notification
// was posted, which Android queues and the app replays in a headless task (src/core/remote.ts,
// src/widgets/headless.ts).

import { systemSurfaces, type Icon, type RunningNotification } from '@modules/system-surfaces';
import { randomUUID } from 'expo-crypto';
import { AppState, Platform } from 'react-native';

import {
  findOpen,
  formatClock,
  type HopwatchState,
  pathLabel,
  previousContextId,
  type ResolvedContext,
  tapCommand,
  useHopwatch,
} from '@/core';
import { androidText } from '@/i18n/android';
import { lightTheme } from '@/jelly/theme';

/** A jelly's icon: its candy and emoji, or its initial when it has none. Shortcuts use it too. */
export function jellyIcon(context: ResolvedContext): Icon {
  const { light, fill, deep, on } = lightTheme.candy[context.hue];
  return { mark: context.glyph ?? context.name.slice(0, 1).toUpperCase(), light, fill, deep, on };
}

/** The id "Back" starts its entry with, one per running entry so reposts stay the same. */
let backEntry: { open: string; id: string } | null = null;
const backEntryId = (open: string) => {
  if (backEntry?.open !== open) backEntry = { open, id: randomUUID() };
  return backEntry.id;
};

/** The notification for the running entry, or null when nothing runs. */
function describe(state: HopwatchState): RunningNotification | null {
  const open = findOpen(state.entries);
  const context = open && state.tree.byId.get(open.contextId);
  if (!open || !context) return null;
  const backId = previousContextId(state.entries);
  const back = backId ? state.tree.byId.get(backId) : undefined;
  const text = androidText.running;
  return {
    title: pathLabel(context),
    text: text.since(formatClock(open.startUtc)),
    since: open.startUtc,
    icon: jellyIcon(context),
    actions: [
      { label: text.stop, command: JSON.stringify(tapCommand(open.id, null, randomUUID)) },
      ...(back && !back.hidden ? [{ label: text.back(back.name), command: JSON.stringify(tapCommand(open.id, back.id, () => backEntryId(open.id))) }] : []),
    ],
    channelName: text.channel,
    channelDescription: text.channelDescription,
  };
}

/** Posts, updates or removes the notification once, for the headless task (headless.ts). */
export async function syncRunningNotification() {
  if (Platform.OS !== 'android' || !systemSurfaces) return;
  const want = describe(useHopwatch.getState());
  if (want) await systemSurfaces.showRunning(want);
  else await systemSurfaces.hideRunning();
}

/**
 * Starts mirroring the running entry into the notification. Call once from the root layout;
 * returns a cleanup function. Android only: elsewhere, and in builds without the native
 * module, it does nothing.
 */
export function startRunningNotification(): () => void {
  const native = systemSurfaces;
  if (Platform.OS !== 'android' || !native) return () => {};

  /** JSON of what's posted, null for nothing, undefined when unknown (at launch, or after a failed post). */
  let shown: string | null | undefined;
  let queue = Promise.resolve();

  const enqueue = (repost: boolean) => {
    const want = describe(useHopwatch.getState());
    const json = want && JSON.stringify(want);
    queue = queue
      .then(async () => {
        if (json === shown && !repost) return;
        if (want) {
          shown = (await native.showRunning(want)) ? json : undefined;
        } else {
          await native.hideRunning();
          shown = null;
        }
      })
      .catch((error: unknown) => {
        shown = undefined;
        console.warn('running notification sync failed', error);
      });
  };

  enqueue(false);
  const unsubscribe = useHopwatch.subscribe((state, prev) => {
    if (state.entries !== prev.entries || state.tree !== prev.tree) enqueue(false);
  });
  const foreground = AppState.addEventListener('change', (status) => status === 'active' && enqueue(true));
  return () => {
    unsubscribe();
    foreground.remove();
  };
}
