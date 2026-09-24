import { type ContextId, MINUTE } from '@/core';

import { SNAP, snap } from '../geometry';

/**
 * Backdating on the dial. `start` picks when a context began, `stop` when the running
 * entry ended. `at` is the chosen instant.
 */
export type Scrub = { kind: 'start'; contextId: ContextId; at: number } | { kind: 'stop'; at: number };

/** The first guess when scrubbing opens: a quarter of an hour ago. */
export const DEFAULT_BACK = 15 * MINUTE;

/** Earliest instant a backdated start may reach. */
export const START_REACH = 18 * 60 * MINUTE;

/** Snaps to a 5-minute mark inside [min, max]; at the max edge, max itself wins. */
export function snapInto(ts: number, min: number, max: number): number {
  if (ts >= max - SNAP / 2) return max;
  return Math.max(min, Math.min(max, snap(ts)));
}
