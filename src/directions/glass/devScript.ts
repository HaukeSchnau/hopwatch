// Development only: scripted states for simulator screenshots while taps are unreliable.
// `/glass?dev=sample,start:Dog,back` runs each step once, in order. Steps: sample, erase,
// start:<context name>, startago:<minutes>:<context name>, back, stop, undo, nudge (as if a
// nudge notification was tapped), and the
// navigation steps entry (last entry's detail), context:<name> (its editor) and
// open:<path>, which run shortly after so the tabs are mounted. toast:<seconds> keeps the
// undo toast up longer, since remote taps take longer than its window.
// TODO: remove once agent-device taps work reliably on the shared builder.

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
      } else if (command === 'open') {
        // `~` and `^` stand in for `?` and `&`, which the outer query can't carry.
        const path = rest.join(':').replace('~', '?').replaceAll('^', '&');
        setTimeout(() => router.push(path as Parameters<typeof router.push>[0]), 900);
      } else if (command === 'entry') {
        const entries = useStint.getState().entries;
        const last = entries[entries.length - 1];
        if (last) setTimeout(() => router.push({ pathname: '/glass/entry/[id]', params: { id: last.id } }), 900);
      } else if (command === 'context') {
        const context = byName(rest.join(':'));
        if (context) setTimeout(() => router.push({ pathname: '/glass/context/[id]', params: { id: context.id } }), 900);
      }
    }
  }, [dev]);
}
