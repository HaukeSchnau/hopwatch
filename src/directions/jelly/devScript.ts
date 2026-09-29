// Development only: scripted states for simulator screenshots, since remote taps on the
// shared builder are slow. `/jelly/?dev=sample,start:Dog,back` runs each step once, in
// order. Steps: sample, erase, start:<name>, startago:<minutes>:<name>, back, stop, undo,
// nudge (as if a nudge was tapped), toast:<seconds> (keeps the undo toast up longer), and
// the navigation steps open:<path> (`~` and `^` stand in for `?` and `&`), context:<name>
// (its editor) and entry (the last entry's detail), which run once the tabs are mounted.
// TODO: remove once Jelly ships as the app on its own.

import { router, useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { actions, eraseAllData, loadSampleData, MINUTE, useStint } from '@/core';

let lastScript: string | null = null;

/** Undo toast window override for slow remote taps. */
export let devToastMs: number | null = null;

function byName(name: string) {
  return useStint.getState().tree.ordered.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function useDevScript() {
  const { dev } = useGlobalSearchParams<{ dev?: string }>();
  useEffect(() => {
    if (!__DEV__ || !dev || dev === lastScript) return;
    lastScript = dev;
    for (const step of dev.split(',')) {
      const [command, ...rest] = step.split(':');
      if (command === 'sample') loadSampleData();
      else if (command === 'erase') eraseAllData();
      else if (command === 'back') actions.back();
      else if (command === 'stop') actions.stop();
      else if (command === 'undo') actions.undo();
      else if (command === 'toast') devToastMs = Number(rest[0]) * 1000;
      else if (command === 'nudge') actions.setIntent({ kind: 'stop-sheet' });
      else if (command === 'start') {
        const context = byName(rest.join(':'));
        if (context) actions.start(context.id);
      } else if (command === 'startago') {
        const context = byName(rest.slice(1).join(':'));
        if (context) actions.start(context.id, { at: Date.now() - Number(rest[0]) * MINUTE });
      } else if (command === 'context') {
        const context = byName(rest.join(':'));
        if (context) setTimeout(() => router.push({ pathname: '/jelly/context', params: { id: context.id } }), 900);
      } else if (command === 'entry') {
        const entries = useStint.getState().entries;
        const last = entries[entries.length - 1];
        if (last) setTimeout(() => router.push({ pathname: '/jelly/entry', params: { id: last.id } }), 900);
      } else if (command === 'open') {
        const path = rest.join(':').replace('~', '?').replaceAll('^', '&');
        setTimeout(() => router.push(path as Parameters<typeof router.push>[0]), 900);
      }
    }
  }, [dev]);
}
