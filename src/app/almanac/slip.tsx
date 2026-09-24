import { useLocalSearchParams } from 'expo-router';

import type { ContextId } from '@/core';
import { Slip } from '@/directions/almanac/Slip';

/** Backdating slip: `?kind=start&context=<id>` or `?kind=stop` (`&from=nudge`). */
export default function SlipRoute() {
  const { kind, context, from } = useLocalSearchParams<{ kind?: string; context?: string; from?: string }>();
  return (
    <Slip
      kind={kind === 'stop' ? 'stop' : 'start'}
      contextId={(context as ContextId | undefined) ?? null}
      fromNudge={from === 'nudge'}
    />
  );
}
