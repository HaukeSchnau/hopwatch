// Android's counterpart of the Live Activity (live-activity.ts): a silent, ongoing
// notification for the running entry. It shows the jelly, a system chronometer counting up
// from the start, and buttons for hopwatch://stop and hopwatch://resume. Posted while an
// entry runs, updated on a switch or an edit, removed on stop, and posted again on launch
// and on every return to the foreground. That brings it back after a force stop, a swipe
// (Android 14 and later let people dismiss it) or a newly granted permission.
//
// The buttons open the app on a link instead of acting in the background, like the Live
// Activity's pills: entries only change through the store's actions in JavaScript, and a
// link reaches them the same way whether the app was open, in the background or killed.

import { systemSurfaces, type Icon, type RunningNotification } from '@modules/system-surfaces';
import { AppState, Platform } from 'react-native';

import {
  findOpen,
  formatClock,
  type HopwatchState,
  pathLabel,
  previousContextId,
  type ResolvedContext,
  resumeLink,
  stopLink,
  useHopwatch,
} from '@/core';
import { androidText } from '@/i18n/android';
import { lightTheme } from '@/jelly/theme';

/** A jelly's icon: its candy and emoji, or its initial when it has none. Shortcuts use it too. */
export function jellyIcon(context: ResolvedContext): Icon {
  const { light, fill, deep, on } = lightTheme.candy[context.hue];
  return { mark: context.glyph ?? context.name.slice(0, 1).toUpperCase(), light, fill, deep, on };
}

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
      { label: text.stop, url: stopLink },
      ...(back && !back.hidden ? [{ label: text.back(back.name), url: resumeLink }] : []),
    ],
    channelName: text.channel,
    channelDescription: text.channelDescription,
  };
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
