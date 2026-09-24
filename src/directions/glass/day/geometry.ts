// Timeline geometry shared by the blocks, the gaps and the drag handles.

import { MINUTE } from '@/core';

/** Points per hour. */
export const HOUR_HEIGHT = 72;
/** Space above midnight so its label isn't clipped. */
export const TOP = 14;
/** Left gutter for the hour labels. */
export const GUTTER = 58;
/** Edges snap to this grid while dragging. */
export const SNAP = 5 * MINUTE;

const PER_MS = HOUR_HEIGHT / 3_600_000;

/** Y offset of a timestamp within the day that starts at `dayStart`. */
export function yAt(ts: number, dayStart: number): number {
  'worklet';
  return TOP + (ts - dayStart) * PER_MS;
}

/** The timestamp at a Y offset, the inverse of `yAt`. */
export function tsAt(y: number, dayStart: number): number {
  'worklet';
  return dayStart + (y - TOP) / PER_MS;
}

export function snap(ts: number): number {
  'worklet';
  return Math.round(ts / SNAP) * SNAP;
}
