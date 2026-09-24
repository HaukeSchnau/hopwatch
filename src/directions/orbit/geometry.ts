// Dial math. The 24-hour ring puts midnight at the bottom and noon at the top, so the
// working day arcs overhead like the sun. Angles are degrees clockwise from 12 o'clock.

import { Skia } from '@shopify/react-native-skia';

import { MINUTE } from '@/core';

export interface DialFrame {
  /** Canvas side length. */
  size: number;
  cx: number;
  cy: number;
  /** Radius of the ring's center line. */
  r: number;
  /** Thickness of the arcs. */
  stroke: number;
}

/** A square frame whose ring leaves `margin` for labels and glow. */
export function dialFrame(size: number, stroke: number, margin: number): DialFrame {
  return { size, cx: size / 2, cy: size / 2, r: size / 2 - margin - stroke / 2, stroke };
}

/** Where a timestamp sits on the ring of the day [dayStart, dayEnd). */
export function timeToDeg(ts: number, dayStart: number, dayEnd: number): number {
  return ((ts - dayStart) / (dayEnd - dayStart)) * 360 + 180;
}

/** Fraction of the day under a dial angle, in [0, 1). */
export function degToFrac(deg: number): number {
  return ((((deg - 180) % 360) + 360) % 360) / 360;
}

export function polar(frame: DialFrame, deg: number, radius = frame.r) {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  return { x: frame.cx + radius * Math.sin(rad), y: frame.cy - radius * Math.cos(rad) };
}

/** The angle of a point around the dial's center, in [0, 360). */
export function pointDeg(frame: DialFrame, x: number, y: number): number {
  const deg = (Math.atan2(x - frame.cx, frame.cy - y) * 180) / Math.PI;
  return (deg + 360) % 360;
}

export const pointRadius = (frame: DialFrame, x: number, y: number) => Math.hypot(x - frame.cx, y - frame.cy);

/** A clockwise arc starting at `fromDeg`. */
export function arcPath(frame: DialFrame, fromDeg: number, sweepDeg: number, radius = frame.r) {
  'worklet';
  const path = Skia.Path.Make();
  path.addArc(Skia.XYWHRect(frame.cx - radius, frame.cy - radius, radius * 2, radius * 2), fromDeg - 90, sweepDeg);
  return path;
}

export const SNAP = 5 * MINUTE;

/** Rounds to the nearest 5-minute mark of the wall clock. */
export const snap = (ts: number, step = SNAP) => Math.round(ts / step) * step;

/**
 * The timestamp under a dial angle that lies closest to `near`, within
 * [min, max]. Used while scrubbing so crossing midnight or "now" never jumps a day.
 */
export function timeAtDeg(deg: number, dayStart: number, dayEnd: number, near: number, min: number, max: number) {
  const span = dayEnd - dayStart;
  const base = dayStart + degToFrac(deg) * span;
  const k = Math.round((near - base) / span);
  const candidate = base + k * span;
  return Math.max(min, Math.min(max, candidate));
}
