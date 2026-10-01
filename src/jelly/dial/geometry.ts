// Dial math, adapted from Orbit. The 24-hour ring puts midnight at the bottom and noon at
// the top, so the working day arcs overhead like the sun. Angles are degrees clockwise
// from 12 o'clock.

import { Skia } from '@shopify/react-native-skia';

export interface DialFrame {
  /** Canvas side length. */
  size: number;
  cx: number;
  cy: number;
  /** Radius of the ring's center line. */
  r: number;
  /** Thickness of the candy track. */
  stroke: number;
}

/** A square frame whose ring leaves `margin` outside it for hour labels. */
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

/** Degrees covered by `px` along the ring at `radius`. */
export const pxToDeg = (px: number, radius: number) => (px / radius) * (180 / Math.PI);

/** A clockwise arc starting at `fromDeg`. */
export function arcPath(frame: DialFrame, fromDeg: number, sweepDeg: number, radius = frame.r) {
  'worklet';
  const path = Skia.Path.Make();
  path.addArc(Skia.XYWHRect(frame.cx - radius, frame.cy - radius, radius * 2, radius * 2), fromDeg - 90, sweepDeg);
  return path;
}

/** The timestamp under a dial angle, on the day [dayStart, dayEnd). */
export function timeAtDeg(deg: number, dayStart: number, dayEnd: number): number {
  return dayStart + degToFrac(deg) * (dayEnd - dayStart);
}
