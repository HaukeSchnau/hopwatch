// The app's side of switching from anywhere (src/core/remote.ts). It publishes the
// snapshot native surfaces show, on every change to entries or jellies, and replays the
// taps they queue: at launch, when a tap comes in while the app runs, and on every return
// to the foreground. On iOS the snapshot feeds the Live Activity, the widgets, the
// controls and Siri, whose app-side code (native/ios/AppSurfaces.swift) catches up on
// each write.

import { systemSurfaces } from '@modules/system-surfaces';
import { AppState } from 'react-native';

import { connectRemoteQueue, drainRemote, type Hue, type HopwatchState, parseCommand, type RemoteCommand, snapshotOf, syncSlack, useHopwatch } from '@/core';
import { coreText } from '@/i18n/core';
import { widgetText } from '@/i18n/widgets';
import { darkTheme, lightTheme, mix } from '@/jelly/theme';

const day = lightTheme.c;
const night = darkTheme.c;

function colors(hue: Hue) {
  const candy = lightTheme.candy[hue];
  return {
    light: candy.light,
    fill: candy.fill,
    deep: candy.deep,
    on: candy.on,
    // At night the hue's light tone is Jelly's text color; it clears 5:1 on the plum.
    accent: [candy.ink, candy.light] as const,
    wash: [candy.tint, mix(night.bg, candy.fill, 0.2)] as const,
  };
}

const paint = {
  bg: [day.bg, night.bg],
  ink: [day.ink, night.ink],
  muted: [day.muted, night.muted],
  stop: [lightTheme.inkCandy.fill, darkTheme.inkCandy.fill],
  onStop: [lightTheme.inkCandy.on, darkTheme.inkCandy.on],
} as const;

/** The surfaces' words in the app's language, with `{name}` and `{duration}` to fill in. */
const strings = {
  stop: widgetText.stop,
  stopName: widgetText.stopName('{name}'),
  back: widgetText.back('{name}'),
  resume: widgetText.resume('{name}'),
  nothing: widgetText.nothing,
  switched: coreText.toast.switched('{name}'),
  stopped: coreText.toast.stopped('{name}'),
  nudgeTitle: coreText.nudge.title('{name}'),
  nudgeBody: coreText.nudge.body('{duration}'),
};

/** Lets the store replay taps from the native queue. False in builds without the native side. */
export function connectSurfaces(): boolean {
  const native = systemSurfaces;
  if (!native || typeof native.writeSnapshot !== 'function') return false;
  connectRemoteQueue({
    read: () =>
      native.readCommands().flatMap((json): RemoteCommand[] => {
        const command = parseCommand(json);
        return command ? [command] : [];
      }),
    remove: (seqs) => native.removeCommands(seqs),
  });
  return true;
}

let written: string | null = null;

/** Writes the snapshot of `state` for the native surfaces, unless it's what they have. */
export function publishSnapshot(state: HopwatchState = useHopwatch.getState()) {
  const json = JSON.stringify(snapshotOf(state.entries, state.tree, colors, paint, strings));
  if (json === written) return;
  written = json;
  systemSurfaces?.writeSnapshot(json);
}

/**
 * Starts publishing the snapshot and replaying taps, and on Android syncing Slack (iOS's
 * native client follows the snapshot itself). Call once from the root layout;
 * returns a cleanup function. Does nothing in builds without the native side.
 */
export function startSurfaces(): () => void {
  if (!connectSurfaces() || !systemSurfaces) return () => {};
  publishSnapshot();
  syncSlack();
  const unsubscribe = useHopwatch.subscribe((state, prev) => {
    if (state.entries === prev.entries && state.tree === prev.tree) return;
    publishSnapshot(state);
    syncSlack();
  });
  const taps = systemSurfaces.addListener('onCommands', () => drainRemote());
  const foreground = AppState.addEventListener('change', (status) => {
    if (status !== 'active') return;
    drainRemote();
    // A Slack call that failed offline gets another go.
    syncSlack();
  });
  return () => {
    unsubscribe();
    taps.remove();
    foreground.remove();
  };
}
