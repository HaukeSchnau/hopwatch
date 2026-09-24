// Development-only launch params, so every Deck state can be reached by route for
// simulator screenshots, e.g. `/deck?dev=sample,start:2` or `/deck?knob=stop`.
// Release builds ignore them.

import { useGlobalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { actions, eraseAllData, loadSampleData, useStint } from '@/core';

let applied = false;

/**
 * Runs the comma-separated `dev` param once per launch: `sample`, `erase`, `start:N`
 * (the context on key N, 1-based), `stop`, and `nudge` (as if a nudge was tapped).
 */
export function useDevData() {
  const { dev } = useGlobalSearchParams<{ dev?: string }>();
  useEffect(() => {
    if (!__DEV__ || applied || !dev) return;
    applied = true;
    for (const step of dev.split(',')) {
      if (step === 'sample') loadSampleData();
      else if (step === 'erase') eraseAllData();
      else if (step === 'stop') actions.stop();
      else if (step === 'nudge') actions.setIntent({ kind: 'stop-sheet' });
      else if (step.startsWith('start:')) {
        const slot = Number(step.slice(6)) - 1;
        const context = useStint.getState().contexts.find((c) => c.pinPosition === slot && c.archivedAt === null);
        if (context) actions.start(context.id);
      }
    }
  }, [dev]);
}

/** A development-only string param, or undefined in release builds. */
export function useDevParam(name: 'knob' | 'trim' | 'open' | 'fill' | 'edit'): string | undefined {
  const value = useGlobalSearchParams()[name];
  return __DEV__ && typeof value === 'string' ? value : undefined;
}
