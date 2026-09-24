// The gummy blob: Jelly's character for a context. A lumpy, glossy candy drawn with
// Skia, with a face that can sleep, wake, blink, look around and yawn. Squash and
// bounce happen on the wrapping view's transform, so the Skia path never re-renders
// for motion; only the face animates inside the canvas.

import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Shadow,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Hue } from '@/core';

import { blobBox, gummyPath } from './geometry';
import { alpha, candy, colors } from './theme';

/** Animatable face state. 0/1 ranges unless noted. */
export interface Face {
  /** 0 asleep (closed arcs), 1 awake (open dot eyes). */
  awake: SharedValue<number>;
  /** 1 open, 0 shut; multiplied into awake eyes. */
  blink: SharedValue<number>;
  /** Pupil offset, -1 … 1. */
  lookX: SharedValue<number>;
  lookY: SharedValue<number>;
  /** 0 closed, 1 mouth wide open. */
  yawn: SharedValue<number>;
}

export function useFace(mood: 'awake' | 'asleep' = 'asleep'): Face {
  const awake = useSharedValue(mood === 'awake' ? 1 : 0);
  const blink = useSharedValue(1);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const yawn = useSharedValue(0);
  // Stable identity, so effects keyed on the face don't restart.
  return useMemo(() => ({ awake, blink, lookX, lookY, yawn }), [awake, blink, lookX, lookY, yawn]);
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

/**
 * Keeps an awake face alive: blinks every few seconds and glances around now and then.
 * Runs on JS timers so nothing ticks between events.
 */
export function useLively(face: Face, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));

    const blink = () => {
      const twice = Math.random() < 0.2;
      const shut = withSequence(withTiming(0, { duration: 70 }), withTiming(1, { duration: 110 }));
      face.blink.set(twice ? withSequence(shut, withDelay(90, shut)) : shut);
      later(2400 + Math.random() * 3600, blink);
    };
    const glance = () => {
      const centre = Math.random() < 0.4;
      face.lookX.set(withSpring(centre ? 0 : Math.random() * 2 - 1, { damping: 12, stiffness: 160 }));
      face.lookY.set(withSpring(centre ? 0 : Math.random() * 1.2 - 0.6, { damping: 12, stiffness: 160 }));
      later(1600 + Math.random() * 3200, glance);
    };
    later(1200 + Math.random() * 1500, blink);
    later(900 + Math.random() * 2000, glance);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [enabled, face]);
}

interface GummyProps {
  size: number;
  hue: Hue;
  /** Seeds the silhouette; use the context id. */
  seed: string;
  face?: Face;
  /** Used when no `face` is passed. */
  mood?: 'awake' | 'asleep';
  shadow?: boolean;
  /** Faded look for archived contexts. */
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A glossy candy blob with a face, drawn in a square canvas of `size`. */
export function Gummy({ size, hue, seed, face, mood = 'asleep', shadow = true, dim = false, style }: GummyProps) {
  const own = useFace(mood);
  const f = face ?? own;
  const c = candy[hue];
  const box = blobBox(size);
  const { cx, cy, rx, ry } = box;
  const path = useMemo(() => gummyPath(seed, blobBox(size)), [seed, size]);
  const shadowPath = useMemo(() => {
    const b = blobBox(size);
    return gummyPath(seed, { ...b, cy: b.cy + b.ry * 0.14 });
  }, [seed, size]);

  // Face geometry.
  const eyeY = cy - ry * 0.02;
  const eyeDX = rx * 0.33;
  const eyeR = Math.max(1.6, rx * 0.095);
  const mouthY = cy + ry * 0.24;
  const mouthW = rx * 0.15;
  const stroke = Math.max(1.4, eyeR * 0.46);
  const cheek = hue === 'pink' || hue === 'red' ? 'rgba(255,255,255,0.28)' : 'rgba(255,105,150,0.34)';

  const sleepyEyes = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (const ex of [cx - eyeDX, cx + eyeDX]) {
      b.moveTo(ex - eyeR * 1.05, eyeY);
      b.quadTo(ex, eyeY + eyeR * 1.35, ex + eyeR * 1.05, eyeY);
    }
    return b.detach();
  }, [cx, eyeDX, eyeR, eyeY]);

  const smile = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    b.moveTo(cx - mouthW, mouthY);
    b.quadTo(cx, mouthY + mouthW * 0.95, cx + mouthW, mouthY);
    return b.detach();
  }, [cx, mouthW, mouthY]);

  const sleepyOpacity = useDerivedValue(() => 1 - f.awake.get());
  const awakeOpacity = useDerivedValue(() => f.awake.get());
  const smileOpacity = useDerivedValue(() => 1 - f.yawn.get());
  const leftEye = useDerivedValue(() => eyeTransform(cx - eyeDX, eyeY, eyeR, f));
  const rightEye = useDerivedValue(() => eyeTransform(cx + eyeDX, eyeY, eyeR, f));
  const yawnTransform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: mouthY + mouthW * 0.35 },
    { scaleY: Math.max(0.001, f.yawn.get()) },
  ]);

  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      <Group opacity={dim ? 0.45 : 1}>
        {shadow && (
          <Path path={shadowPath} color={c.glow}>
            <BlurMask blur={rx * 0.12} style="normal" />
          </Path>
        )}
        <Path path={path}>
          <LinearGradient start={vec(cx, cy - ry)} end={vec(cx, cy + ry)} colors={[c.light, c.fill, c.deep]} positions={[0, 0.48, 1]} />
          <Shadow dx={0} dy={-ry * 0.16} blur={ry * 0.14} color={alpha(c.deep, 0.6)} inner />
          <Shadow dx={0} dy={ry * 0.07} blur={ry * 0.07} color="rgba(255,255,255,0.55)" inner />
        </Path>
        <Path path={path}>
          <RadialGradient c={vec(cx + rx * 0.05, cy + ry * 0.42)} r={rx * 0.75} colors={[alpha(c.light, 0.5), alpha(c.light, 0)]} />
        </Path>
        {/* Gloss */}
        <Group transform={[{ translateX: cx - rx * 0.34 }, { translateY: cy - ry * 0.55 }, { rotate: -0.42 }]}>
          <Oval x={-rx * 0.3} y={-ry * 0.12} width={rx * 0.6} height={ry * 0.24} color="rgba(255,255,255,0.7)">
            <BlurMask blur={Math.max(0.6, rx * 0.035)} style="normal" />
          </Oval>
        </Group>
        <Circle cx={cx - rx * 0.66} cy={cy - ry * 0.18} r={Math.max(1, rx * 0.05)} color="rgba(255,255,255,0.8)" />
        {/* Cheeks */}
        <Oval x={cx - eyeDX - rx * 0.3} y={eyeY + ry * 0.14} width={rx * 0.26} height={ry * 0.15} color={cheek}>
          <BlurMask blur={Math.max(0.5, rx * 0.03)} style="normal" />
        </Oval>
        <Oval x={cx + eyeDX + rx * 0.04} y={eyeY + ry * 0.14} width={rx * 0.26} height={ry * 0.15} color={cheek}>
          <BlurMask blur={Math.max(0.5, rx * 0.03)} style="normal" />
        </Oval>
        {/* Eyes */}
        <Path path={sleepyEyes} style="stroke" strokeWidth={stroke} strokeCap="round" color={colors.ink} opacity={sleepyOpacity} />
        <Group opacity={awakeOpacity}>
          {[leftEye, rightEye].map((transform, i) => (
            <Group key={i} transform={transform}>
              <Circle cx={0} cy={0} r={eyeR} color={colors.ink} />
              <Circle cx={-eyeR * 0.34} cy={-eyeR * 0.36} r={eyeR * 0.36} color="white" />
            </Group>
          ))}
        </Group>
        {/* Mouth */}
        <Path path={smile} style="stroke" strokeWidth={stroke} strokeCap="round" color={colors.ink} opacity={smileOpacity} />
        <Group transform={yawnTransform}>
          <Oval x={-mouthW * 0.62} y={-mouthW * 0.8} width={mouthW * 1.24} height={mouthW * 1.6} color={colors.ink} />
          <Oval x={-mouthW * 0.36} y={mouthW * 0.1} width={mouthW * 0.72} height={mouthW * 0.55} color="#FF7A9C" />
        </Group>
      </Group>
    </Canvas>
  );
}

function eyeTransform(x: number, y: number, r: number, f: Face) {
  'worklet';
  return [
    { translateX: x + f.lookX.get() * r * 0.5 },
    { translateY: y + f.lookY.get() * r * 0.4 },
    { scaleY: Math.max(0.08, f.blink.get()) },
  ];
}
