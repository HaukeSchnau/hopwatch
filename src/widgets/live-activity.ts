// Keeps the running-entry Live Activity in step with the store: one activity while an
// entry runs, updated on a switch or a context edit, ended on stop. Reconciles with
// ActivityKit on launch and on every return to the foreground. That adopts or ends
// activities left from an earlier run, and brings one back after iOS ended it, which it
// does after 8 hours.

import type { LiveActivity } from 'expo-widgets';
import { AppState, DynamicColorIOS } from 'react-native';

import { findOpen, type Hue, previousContextId, type HopwatchState, useHopwatch } from '@/core';
import { widgetText } from '@/i18n/widgets';
import { darkTheme, lightTheme, mix } from '@/jelly/theme';

import { type RunningActivityProps, runningActivity } from './running-activity';

const dayNight = (light: string, dark: string) => DynamicColorIOS({ light, dark });

function paint(hue: Hue): Pick<RunningActivityProps, 'candy' | 'paint'> {
  const candy = lightTheme.candy[hue];
  const day = lightTheme.c;
  const night = darkTheme.c;
  return {
    candy: { light: candy.light, fill: candy.fill, deep: candy.deep, on: candy.on },
    paint: {
      bg: dayNight(day.bg, night.bg),
      ink: dayNight(day.ink, night.ink),
      muted: dayNight(day.muted, night.muted),
      // At night the hue's light tone is Jelly's text color; it clears 5:1 on the plum.
      accent: dayNight(candy.ink, candy.light),
      wash: dayNight(candy.tint, mix(night.bg, candy.fill, 0.2)),
      stop: dayNight(lightTheme.inkCandy.fill, darkTheme.inkCandy.fill),
      onStop: dayNight(lightTheme.inkCandy.on, darkTheme.inkCandy.on),
    },
  };
}

/** The activity's content for the running entry, or null when nothing runs. */
function describe(state: HopwatchState): RunningActivityProps | null {
  const open = findOpen(state.entries);
  const context = open && state.tree.byId.get(open.contextId);
  if (!open || !context) return null;
  const backId = previousContextId(state.entries);
  const back = backId ? state.tree.byId.get(backId) : undefined;
  return {
    mark: context.glyph ?? context.name.slice(0, 1).toUpperCase(),
    name: context.name,
    path: context.ancestors.map((a) => a.name).join(' › ') || null,
    since: open.startUtc,
    stop: widgetText.stop,
    back: back && !back.hidden ? widgetText.back(back.name) : null,
    ...paint(context.hue),
  };
}

/** The activity this run last started or updated, with the props it shows. */
let shown: { activity: LiveActivity<RunningActivityProps>; json: string } | null = null;
let queue = Promise.resolve();

/** Makes ActivityKit hold exactly one activity showing `want`, or none for null. */
async function sync(want: RunningActivityProps | null) {
  const running = runningActivity.getInstances();
  const keep = want ? (running.find((a) => a.getId() === shown?.activity.getId()) ?? running[0] ?? null) : null;
  await Promise.all(running.filter((a) => a !== keep).map((a) => a.end('immediate')));
  if (!want) {
    shown = null;
    return;
  }
  const json = JSON.stringify(want);
  if (!keep) {
    shown = { activity: runningActivity.start(want), json };
  } else if (keep.getId() !== shown?.activity.getId() || json !== shown.json) {
    await keep.update(want);
    shown = { activity: keep, json };
  }
}

/** Disabled in Settings or unsupported: Hopwatch then simply has no Live Activity. */
const isUnavailable = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'ERR_LIVE_ACTIVITIES_NOT_SUPPORTED';

/**
 * Starts mirroring the running entry into a Live Activity. Call once from the root
 * layout; returns a cleanup function.
 */
export function startLiveActivity(): () => void {
  const enqueue = () => {
    const want = describe(useHopwatch.getState());
    queue = queue
      .then(() => sync(want))
      .catch((error: unknown) => {
        if (!isUnavailable(error)) console.warn('live activity sync failed', error);
      });
  };
  enqueue();
  const unsubscribe = useHopwatch.subscribe((state, prev) => {
    if (state.entries !== prev.entries || state.tree !== prev.tree) enqueue();
  });
  const foreground = AppState.addEventListener('change', (status) => status === 'active' && enqueue());
  return () => {
    unsubscribe();
    foreground.remove();
  };
}
