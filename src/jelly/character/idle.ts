// Personalities: how an awake jelly idles. Each one blinks and glances at its own pace
// and has a signature move (a hop, a yawn, a shiver…). Moves are one-shot Reanimated
// animations on the face's shared values, scheduled by JS timers in `useLively`, so
// nothing runs per frame on the JS thread.

import { Easing, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import type { Face } from '../Gummy';
import { springs } from '../theme';
import type { Motion } from './traits';

type Range = readonly [number, number];

export interface Personality {
  /** Pause between blinks, in ms. */
  blink: Range;
  /** Chance of a double blink. */
  twice: number;
  /** Pause between glances, and how far they reach (0 … 1). */
  glance: Range;
  reach: number;
  /** Pause between signature moves. */
  every: Range;
  /** Plays the signature move and returns how long it keeps the face busy, in ms. */
  move: (face: Face) => number;
}

const inOut = Easing.inOut(Easing.sin);

/** Little hops, one per height: crouch, jump, land with a squash. */
export function hop(face: Face, heights: readonly number[] = [1]): number {
  face.hop.set(
    withSequence(
      ...heights.flatMap((height) => [
        withDelay(90, withTiming(height, { duration: 210, easing: Easing.out(Easing.quad) })),
        withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }),
        withDelay(170, withTiming(0, { duration: 0 })),
      ]),
    ),
  );
  face.squash.set(
    withSequence(
      ...heights.flatMap(() => [
        withTiming(0.12, { duration: 90 }),
        withTiming(-0.1, { duration: 110 }),
        withTiming(0, { duration: 170 }),
        withDelay(110, withTiming(0.16, { duration: 60 })),
        withTiming(0, { duration: 120 }),
      ]),
      withSpring(0, springs.wobble),
    ),
  );
  return 660 * heights.length + 200;
}

/** A big yawn with a stretch, eyes heavy. */
export function yawn(face: Face): number {
  face.yawn.set(withSequence(withTiming(1, { duration: 420 }), withDelay(520, withTiming(0, { duration: 320 }))));
  face.blink.set(withSequence(withTiming(0.3, { duration: 380 }), withDelay(700, withTiming(1, { duration: 260 }))));
  face.squash.set(withSequence(withTiming(-0.07, { duration: 420 }), withDelay(520, withSpring(0, springs.soft))));
  return 1500;
}

/** Eyes drooping shut… then a startled little jolt awake. */
function nodOff(face: Face): number {
  face.blink.set(withSequence(withTiming(0.12, { duration: 1400, easing: inOut }), withDelay(500, withTiming(1.2, { duration: 90 })), withSpring(1, { damping: 8, stiffness: 300 })));
  face.hop.set(withDelay(1900, withSequence(withTiming(0.22, { duration: 90 }), withTiming(0, { duration: 160 }))));
  face.lookY.set(withSequence(withTiming(0.4, { duration: 900 }), withDelay(1000, withTiming(0, { duration: 150 }))));
  return 2400;
}

/** A quick shiver, side to side. */
export function shiver(face: Face): number {
  face.shiver.set(withSequence(...[1, -1, 1, -1, 0.7, -0.7, 0.4, 0].map((v) => withTiming(v, { duration: 42 }))));
  return 400;
}

/** Swells up, chin raised, eyes smug. */
export function puff(face: Face): number {
  face.puff.set(withSequence(withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }), withDelay(900, withSpring(0, springs.wobble))));
  face.lookY.set(withSequence(withTiming(-0.7, { duration: 400 }), withDelay(1050, withTiming(0, { duration: 300 }))));
  face.blink.set(withSequence(withTiming(0.55, { duration: 300 }), withDelay(1150, withTiming(1, { duration: 200 }))));
  return 1800;
}

/** Tilts the head and peeks to one side. */
export function tilt(face: Face): number {
  const side = Math.random() < 0.5 ? -1 : 1;
  face.tilt.set(withSequence(withSpring(side * 10, springs.soft), withDelay(1300, withSpring(0, springs.soft))));
  face.lookX.set(withSequence(withSpring(side * 0.9, springs.soft), withDelay(1300, withSpring(0, springs.soft))));
  face.lookY.set(withSequence(withTiming(-0.3, { duration: 300 }), withDelay(1300, withTiming(0, { duration: 300 }))));
  return 2000;
}

/** A slow sway, gazing up at nothing in particular. */
export function sway(face: Face): number {
  face.tilt.set(withSequence(withTiming(-4, { duration: 1100, easing: inOut }), withTiming(4, { duration: 2000, easing: inOut }), withTiming(0, { duration: 1100, easing: inOut })));
  face.lookY.set(withSequence(withTiming(-0.8, { duration: 900, easing: inOut }), withDelay(2400, withTiming(0, { duration: 900, easing: inOut }))));
  face.lookX.set(withSequence(withTiming(-0.5, { duration: 1100, easing: inOut }), withTiming(0.5, { duration: 2000, easing: inOut }), withTiming(0, { duration: 1100, easing: inOut })));
  return 4200;
}

/** A happy wiggle. */
export function wiggle(face: Face): number {
  face.tilt.set(withSequence(...[-7, 7, -6, 6, -4, 3, 0].map((v) => withTiming(v, { duration: 95 }))));
  face.squash.set(withSequence(...[0.06, -0.04, 0.05, -0.03, 0].map((v) => withTiming(v, { duration: 130 }))));
  return 700;
}

export const personalities: Record<Motion, Personality> = {
  bouncy: {
    blink: [2400, 5200],
    twice: 0.2,
    glance: [1600, 3600],
    reach: 1,
    every: [3200, 7000],
    move: (face) => hop(face, Math.random() < 0.35 ? [0.6, 1] : [1]),
  },
  dozy: {
    blink: [3200, 6500],
    twice: 0.05,
    glance: [4200, 8000],
    reach: 0.5,
    every: [6500, 12000],
    move: (face) => (Math.random() < 0.6 ? yawn(face) : nodOff(face)),
  },
  jittery: {
    blink: [1300, 3200],
    twice: 0.45,
    glance: [600, 1500],
    reach: 1.1,
    every: [3500, 7500],
    move: shiver,
  },
  proud: {
    blink: [3000, 6000],
    twice: 0.1,
    glance: [2800, 5500],
    reach: 0.7,
    every: [6000, 11000],
    move: puff,
  },
  curious: {
    blink: [2400, 5000],
    twice: 0.2,
    glance: [1100, 2600],
    reach: 1.1,
    every: [3500, 7000],
    move: tilt,
  },
  dreamy: {
    blink: [3200, 6200],
    twice: 0.1,
    glance: [3000, 6000],
    reach: 0.6,
    every: [5500, 9500],
    move: sway,
  },
  wiggly: {
    blink: [2400, 5000],
    twice: 0.25,
    glance: [1800, 3800],
    reach: 1,
    every: [3500, 7500],
    move: wiggle,
  },
};

/** Plays a personality's signature move once, e.g. to preview it in the editor. */
export const perform = (face: Face, motion: Motion) => personalities[motion].move(face);
