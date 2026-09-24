import { router } from 'expo-router';
import { useEffect } from 'react';

import { actions, useIntent, useStint } from '@/core';

/**
 * A tapped nudge notification asks for the stop sheet. Almanac answers with the
 * backdated-stop slip, from whichever page is open, once the layout can navigate.
 */
export function useNudgeIntent(ready: boolean) {
  const intent = useIntent();
  useEffect(() => {
    if (!intent || !ready) return;
    actions.consumeIntent();
    const running = useStint.getState().entries.some((e) => e.endUtc === null);
    if (intent.kind === 'stop-sheet' && running) {
      router.push({ pathname: '/almanac/slip', params: { kind: 'stop', from: 'nudge' } });
    }
  }, [intent, ready]);
}
