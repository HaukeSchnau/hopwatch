// The launcher's shortcuts on Android (long-press the app icon): "Stop" and "Back to X"
// while something runs, "Resume X" when nothing does, then pinned jellies ("Start Job"), up
// to the four that launchers show. Each opens a hopwatch:// link (src/core/links.ts), which
// src/app/+native-intent.tsx runs.
//
// All of them are dynamic shortcuts from the store. Static ones from the manifest can't
// change or hide, so a fixed "Stop" would linger with nothing running, and before the first
// launch there's nothing to stop, resume or start anyway.

import { type Shortcut, systemSurfaces } from '@modules/system-surfaces';
import { Platform } from 'react-native';

import { findOpen, type HopwatchState, previousContextId, resumeLink, startLink, stopLink, useHopwatch } from '@/core';
import { androidText } from '@/i18n/android';
import { lightTheme } from '@/jelly/theme';

import { jellyIcon } from './running-notification';

/** Launchers show four shortcuts in the long-press menu. */
const MAX_SHORTCUTS = 4;

function describe(state: HopwatchState): Shortcut[] {
  const t = androidText.shortcuts;
  const open = findOpen(state.entries);
  const running = open ? state.tree.byId.get(open.contextId) : undefined;
  const backId = previousContextId(state.entries);
  const back = backId ? state.tree.byId.get(backId) : undefined;
  const shortcuts: Shortcut[] = [];

  if (running) {
    const { light, fill, deep, on } = lightTheme.inkCandy;
    shortcuts.push({
      id: 'stop',
      shortLabel: t.stop,
      longLabel: t.stopNamed(running.name),
      url: stopLink,
      icon: { mark: null, light, fill, deep, on },
    });
  }
  // Hidden jellies can't be resumed (see `actions.back`).
  const target = back && !back.hidden ? back : undefined;
  if (target) {
    shortcuts.push({
      id: 'resume',
      shortLabel: target.name,
      longLabel: (running ? t.back : t.resume)(target.name),
      url: resumeLink,
      icon: jellyIcon(target),
    });
  }
  const pinned = state.tree.ordered
    .filter((c) => c.pinPosition !== null && !c.hidden && c.id !== running?.id && c.id !== target?.id)
    .sort((a, b) => (a.pinPosition ?? 0) - (b.pinPosition ?? 0));
  for (const c of pinned) {
    shortcuts.push({ id: `start:${c.id}`, shortLabel: c.name, longLabel: t.start(c.name), url: startLink(c.id), icon: jellyIcon(c) });
  }
  return shortcuts.slice(0, MAX_SHORTCUTS);
}

/**
 * Starts mirroring the store into the launcher's shortcuts. Call once from the root layout;
 * returns a cleanup function. Android only: elsewhere, and in builds without the native
 * module, it does nothing.
 */
export function startShortcuts(): () => void {
  const native = systemSurfaces;
  if (Platform.OS !== 'android' || !native) return () => {};

  let shown: string | undefined;
  let queue = Promise.resolve();
  const enqueue = () => {
    const want = describe(useHopwatch.getState());
    const json = JSON.stringify(want);
    queue = queue
      .then(async () => {
        if (json === shown) return;
        await native.setShortcuts(want);
        shown = json;
      })
      .catch((error: unknown) => console.warn('shortcuts sync failed', error));
  };

  enqueue();
  return useHopwatch.subscribe((state, prev) => {
    if (state.entries !== prev.entries || state.tree !== prev.tree) enqueue();
  });
}
