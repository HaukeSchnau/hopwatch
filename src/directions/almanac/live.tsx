// Leaf components that tick. Each subscribes to the clock on its own, so a page
// re-renders once per edition, not once per second.

import { Text, type TextProps } from 'react-native';

import { durationParts, formatDuration, useNow } from '@/core';

/** h:mm since `since`, refreshed every second. Nest it inside a styled Text. */
export function Elapsed({ since, ...props }: { since: number } & TextProps) {
  const now = useNow(1000);
  return <Text {...props}>{formatDuration(now - since)}</Text>;
}

/** h:mm:ss since `since`, for the small live figure beside a running headline. */
export function Stopwatch({ since, ...props }: { since: number } & TextProps) {
  const now = useNow(1000);
  const { hours, minutes, seconds } = durationParts(now - since);
  return (
    <Text {...props}>
      {hours}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </Text>
  );
}
