// The gummy: Jelly's character for a context, drawn with Skia. A body archetype in glossy
// candy, a face that can sleep, wake, blink, look around and yawn, and whatever the look
// adds (hats, ears, neckwear, a coat). Everything is drawn in a 100-unit box scaled to
// `size`; body motion (hops, tilts, puffs) happens on the wrapping view in Character, so
// the Skia picture only redraws for face animations.

import { BlurMask, Canvas, Group, LinearGradient, Oval, Path, RadialGradient, Shadow, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Hue } from '@/core';

import { type BodyGeo, bodyGeo, UNIT } from './character/bodies';
import { Cheeks, EyesPart, type Lod, MouthPart, mouthDrop } from './character/face';
import { personalities } from './character/idle';
import { accentHue, blushFor } from './character/paint';
import { isBehind, TopperBack, TopperFront } from './character/toppers';
import type { Look, Motion, Topper } from './character/traits';
import { CoatPart, NeckPart } from './character/wear';
import { alpha, type Candy, useTheme } from './theme';

/** Animatable face state. 0/1 ranges unless noted. */
export interface Face {
  /** 0 asleep (closed eyes), 1 awake. */
  awake: SharedValue<number>;
  /** 1 open, 0 shut; multiplied into awake eyes. */
  blink: SharedValue<number>;
  /** Glance direction, -1 … 1. */
  lookX: SharedValue<number>;
  lookY: SharedValue<number>;
  /** 0 closed, 1 mouth wide open. */
  yawn: SharedValue<number>;
  /** Body motion, played by `useLively` and drawn by Character: hop height 0 … 1. */
  hop: SharedValue<number>;
  /** Positive squashes, negative stretches. */
  squash: SharedValue<number>;
  /** Lean in degrees. */
  tilt: SharedValue<number>;
  /** 0 … 1 swell. */
  puff: SharedValue<number>;
  /** Sideways jitter, -1 … 1. */
  shiver: SharedValue<number>;
  /** The personality `useLively` plays; the Character wearing this face sets it. */
  motion: SharedValue<Motion>;
}

export function useFace(mood: 'awake' | 'asleep' = 'asleep'): Face {
  const awake = useSharedValue(mood === 'awake' ? 1 : 0);
  const blink = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const yawn = useSharedValue(0);
  const hop = useSharedValue(0);
  const squash = useSharedValue(0);
  const tilt = useSharedValue(0);
  const puff = useSharedValue(0);
  const shiver = useSharedValue(0);
  const motion = useSharedValue<Motion>('bouncy');
  // Stable identity, so effects keyed on the face don't restart.
  return useMemo(
    () => ({ awake, blink, lookX, lookY, yawn, hop, squash, tilt, puff, shiver, motion }),
    [awake, blink, lookX, lookY, yawn, hop, squash, tilt, puff, shiver, motion],
  );
}

/** Opens the eyes with a little startled blink. */
export function wake(face: Face) {
  face.yawn.set(withTiming(0, { duration: 120 }));
  face.awake.set(withTiming(1, { duration: 140 }));
  face.blink.set(withSequence(withTiming(1.25, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 300 })));
}

/** A yawn, then the eyes fall shut. */
export function sleep(face: Face, delay = 0) {
  face.lookX.set(withTiming(0, { duration: 200 }));
  face.lookY.set(withTiming(0, { duration: 200 }));
  face.yawn.set(withDelay(delay, withSequence(withTiming(1, { duration: 260 }), withDelay(260, withTiming(0, { duration: 220 })))));
  face.awake.set(withDelay(delay + 160, withTiming(0, { duration: 420 })));
}

/** Puts the body back at rest after idling. */
function settle(face: Face) {
  for (const value of [face.hop, face.squash, face.tilt, face.puff, face.shiver]) value.set(withTiming(0, { duration: 180 }));
  face.blink.set(withTiming(1, { duration: 120 }));
}

/**
 * Keeps an awake face alive in its personality (see character/idle.ts): blinks, glances
 * and a signature move now and then, like a hop or a yawn. Runs on JS timers, so nothing
 * ticks between events. With Reduce Motion on, it only blinks and glances.
 */
export function useLively(face: Face, enabled: boolean) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let busyUntil = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (ms: number, fn: () => void) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (alive) fn();
      }, ms);
      timers.add(timer);
    };
    const who = () => personalities[face.motion.get()];
    const pause = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min);
    const free = () => Date.now() > busyUntil;

    const blink = () => {
      if (free()) {
        const shut = withSequence(withTiming(0, { duration: 70 }), withTiming(1, { duration: 110 }));
        face.blink.set(Math.random() < who().twice ? withSequence(shut, withDelay(90, shut)) : shut);
      }
      later(pause(who().blink), blink);
    };
    const glance = () => {
      if (free()) {
        const centre = Math.random() < 0.35;
        const reach = who().reach;
        const spring = { damping: 12, stiffness: 160 };
        face.lookX.set(withSpring(centre ? 0 : (Math.random() * 2 - 1) * reach, spring));
        face.lookY.set(withSpring(centre ? 0 : (Math.random() * 1.2 - 0.6) * reach, spring));
      }
      later(pause(who().glance), glance);
    };
    const move = () => {
      if (free()) busyUntil = Date.now() + who().move(face);
      later(pause(who().every), move);
    };
    later(1200 + Math.random() * 1500, blink);
    later(900 + Math.random() * 2000, glance);
    if (!reduceMotion) later(pause(who().every) * 0.5, move);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      settle(face);
    };
  }, [enabled, face, reduceMotion]);
}

/** Level of detail for a size: fine details disappear first. */
export const lodFor = (size: number): Lod => (size < 44 ? 0 : size < 84 ? 1 : 2);

interface GummyProps {
  size: number;
  hue: Hue;
  look: Look;
  /** Seeds the body's proportions and pattern; use the context id. */
  seed: string;
  face?: Face;
  /** Used when no `face` is passed. */
  mood?: 'awake' | 'asleep';
  shadow?: boolean;
  /** Faded look for archived contexts. */
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A glossy candy character in a square canvas of `size`. */
export function Gummy({ size, hue, look, seed, face, mood = 'asleep', shadow = true, dim = false, style }: GummyProps) {
  const own = useFace(mood);
  const f = face ?? own;
  const { candy } = useTheme();
  const c = candy[hue];
  const accent = candy[accentHue[hue]];
  const geo = bodyGeo(look.body, seed);
  const lod = lodFor(size);
  const unit = size / UNIT;
  const px = 1 / unit;
  // Small characters get a bigger face, so it still reads at 28 pt.
  const faceScale = geo.face.s * (size < 44 ? 1.22 : size < 64 ? 1.08 : 1);
  const faceTransform = [{ translateX: geo.face.x }, { translateY: geo.face.y }, { scale: faceScale }];
  const facePx = px / faceScale;
  const topper = { topper: look.topper, geo, tones: c, accent, lod, px };
  const dress = useDress(look.topper, seed);
  const dressed = useDerivedValue(() => [{ translateY: -(1 - dress.get()) * 16 }]);
  const dressOpacity = useDerivedValue(() => Math.min(1, Math.max(0, dress.get() * 2.5)));

  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      <Group transform={[{ scale: unit }]} opacity={dim ? 0.45 : 1}>
        {shadow && (
          // Narrowed a little, so the blur of wide bodies stays inside the canvas.
          <Group transform={[{ translateX: geo.face.x }, { translateY: 3 }, { scaleX: 0.9 }, { translateX: -geo.face.x }]}>
            <Path path={geo.path} color={c.glow}>
              <BlurMask blur={3.6} style="normal" />
            </Path>
          </Group>
        )}
        {isBehind(look.topper) && (
          <Group transform={dressed} opacity={dressOpacity}>
            <TopperBack {...topper} />
          </Group>
        )}
        <BodyFill geo={geo} c={c} />
        <Group clip={geo.path}>
          <CoatPart surface={look.surface} geo={geo} tones={c} seed={seed} lod={lod} />
          <Gloss geo={geo} />
          <Group transform={faceTransform}>
            <Cheeks blush={blushFor(hue)} freckles={look.surface === 'freckles'} tones={c} lod={lod} spread={look.eyes === 'glasses' ? 21 : 19.5} />
          </Group>
        </Group>
        <NeckPart neck={look.neck} geo={geo} accent={accent} lod={lod} />
        <Group transform={faceTransform}>
          <EyesPart style={look.eyes} face={f} lod={lod} px={facePx} tones={c} />
          <MouthPart style={look.mouth} face={f} lod={lod} px={facePx} tones={c} drop={mouthDrop[look.eyes]} />
        </Group>
        <Group transform={dressed} opacity={dressOpacity}>
          <TopperFront {...topper} />
        </Group>
        {lod > 0 && <Sparkles dress={dress} geo={geo} />}
      </Group>
    </Canvas>
  );
}

function BodyFill({ geo, c }: { geo: BodyGeo; c: Candy }) {
  const h = geo.bottom - geo.top;
  const w = geo.right - geo.left;
  return (
    <>
      <Path path={geo.path}>
        <LinearGradient start={vec(0, geo.top)} end={vec(0, geo.bottom)} colors={[c.light, c.fill, c.deep]} positions={[0, 0.48, 1]} />
        <Shadow dx={0} dy={-h * 0.1} blur={h * 0.09} color={alpha(c.deep, 0.6)} inner />
        <Shadow dx={0} dy={h * 0.045} blur={h * 0.045} color="rgba(255,255,255,0.55)" inner />
      </Path>
      <Path path={geo.path}>
        <RadialGradient c={vec(geo.face.x + 2, geo.top + h * 0.8)} r={w * 0.42} colors={[alpha(c.light, 0.5), alpha(c.light, 0)]} />
      </Path>
    </>
  );
}

function Gloss({ geo }: { geo: BodyGeo }) {
  const { x, y, angle, w } = geo.gloss;
  return (
    <>
      <Group transform={[{ translateX: x }, { translateY: y }, { rotate: (angle * Math.PI) / 180 }]}>
        <Oval x={-w / 2} y={-w * 0.18} width={w} height={w * 0.36} color="rgba(255,255,255,0.7)">
          <BlurMask blur={Math.max(0.6, w * 0.055)} style="normal" />
        </Oval>
      </Group>
      <Oval x={geo.glint.x - 1.9} y={geo.glint.y - 1.9} width={3.8} height={3.8} color="rgba(255,255,255,0.8)" />
    </>
  );
}

/**
 * 0 → 1 whenever the same character changes its topper, e.g. when the on-device model
 * dresses it up or someone picks a hat, so the new one drops in with a sparkle.
 */
function useDress(topper: Topper, seed: string) {
  const dress = useSharedValue(1);
  const last = useRef({ topper, seed });
  useEffect(() => {
    const before = last.current;
    last.current = { topper, seed };
    if (before.seed !== seed || before.topper === topper) return;
    dress.set(withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 9, stiffness: 150 })));
  }, [dress, seed, topper]);
  return dress;
}

const SPARKLE = 'M 0 -1 Q 0.16 -0.16 1 0 Q 0.16 0.16 0 1 Q -0.16 0.16 -1 0 Q -0.16 -0.16 0 -1 Z';

/** Four glints around the head that pop while a new topper lands. */
function Sparkles({ dress, geo }: { dress: SharedValue<number>; geo: BodyGeo }) {
  const pop = useDerivedValue(() => {
    const t = dress.get();
    return t >= 0.999 ? 0 : Math.sin(Math.PI * Math.min(1, t));
  });
  const spots = [
    { x: geo.crown.x - geo.crown.w * 0.62, y: geo.crown.y - 3, s: 4.4 },
    { x: geo.crown.x + geo.crown.w * 0.66, y: geo.crown.y - 7, s: 5.2 },
    { x: geo.crown.x - geo.crown.w * 0.3, y: geo.crown.y - 16, s: 3.4 },
    { x: geo.crown.x + geo.crown.w * 0.24, y: geo.crown.y - 19, s: 3 },
  ];
  return (
    <Group opacity={pop}>
      {spots.map((spot, i) => (
        <Sparkle key={i} {...spot} pop={pop} />
      ))}
    </Group>
  );
}

function Sparkle({ x, y, s, pop }: { x: number; y: number; s: number; pop: SharedValue<number> }) {
  const transform = useDerivedValue(() => [{ translateX: x }, { translateY: Math.max(1.5 * s, y) }, { scale: s * (0.4 + pop.get() * 0.8) }, { rotate: pop.get() }]);
  return (
    <Group transform={transform}>
      <Path path={SPARKLE} color="#FFF6B8" />
    </Group>
  );
}
