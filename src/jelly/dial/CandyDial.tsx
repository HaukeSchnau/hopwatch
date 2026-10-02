// The candy dial: Orbit's 24-hour ring in Jelly's language. A glossy candy groove holds
// the day; each entry is a jelly bean pressed into it (rounded caps, a gloss line, a
// colored shadow), short ones are round candy beads, and the running bean grows live
// with a soft glowing head. Midnight sits at the bottom, noon on top.
//
// The head breathes all the time, so it has a small canvas of its own on top of the dial:
// the dial itself only redraws when its beans change.

import { BlurMask, Canvas, Circle, Group, Path, RadialGradient, vec } from '@shopify/react-native-skia';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { DayReport, EntryId, Hue, Running } from '@/core';

import { useShowing } from '../showing';
import { type Candy, mix, text, useTheme } from '../theme';
import { arcPath, type DialFrame, polar, pxToDeg, timeToDeg } from './geometry';

/** One entry on the ring. */
export interface DialBean {
  key: string;
  start: number;
  end: number;
  hue: Hue;
  /** The running entry: grows live and wears a glowing head. */
  running?: boolean;
  /** Highlighted with a halo, e.g. the bean picked on Day. */
  selected?: boolean;
}

/**
 * The beans of a day report, with the running one growing to `now`. A just-started entry
 * shows at once, before the report's own clock has caught up with it.
 */
export function dayBeans(report: DayReport, running: Running | null, now: number, selected: EntryId | null = null): DialBean[] {
  const beans: DialBean[] = report.segments.map((s) => ({
    key: s.entry.id,
    start: s.start,
    end: s.running ? Math.max(now, s.start) : s.end,
    hue: s.context.hue,
    running: s.running,
    selected: s.entry.id === selected,
  }));
  const start = running?.entry.startUtc ?? 0;
  if (running && !report.segments.some((s) => s.running) && start >= report.start && start < report.end) {
    beans.push({ key: running.entry.id, start, end: Math.max(now, start), hue: running.context.hue, running: true });
  }
  return beans;
}

interface CandyDialProps {
  frame: DialFrame;
  dayStart: number;
  dayEnd: number;
  beans: readonly DialBean[];
  /** Marks now and fades the future. Null for days that are over. */
  now: number | null;
  /**
   * 0 → 1 when a new running bean lights up: it pours in along its arc, its head pops and
   * a ripple runs out from it. Stays at 1 otherwise.
   */
  ignite?: SharedValue<number>;
  /** Hour labels around the ring. */
  labels?: boolean;
  /** Extra Skia layers above the beans. */
  children?: ReactNode;
}

/** Gap between neighbouring beans, in points. */
const GAP = 1.6;

type Shape =
  | { kind: 'bean'; from: number; sweep: number; head: number }
  | { kind: 'dot'; mid: number; diameter: number };

/** A bean between two angles, shrunk so its round caps end exactly at its times. */
function shapeOf(a0: number, a1: number, r: number, width: number): Shape {
  const gap = pxToDeg(GAP, r);
  const cap = pxToDeg(width / 2, r);
  const from = a0 + gap + cap;
  const to = a1 - gap - cap;
  if (to - from > 0.1) return { kind: 'bean', from, sweep: to - from, head: to };
  const length = ((Math.max(0, a1 - a0 - 2 * gap) * Math.PI) / 180) * r;
  return { kind: 'dot', mid: (a0 + a1) / 2, diameter: Math.min(width, Math.max(width * 0.45, length)) };
}

export function CandyDial({ frame, dayStart, dayEnd, beans, now, ignite, labels = true, children }: CandyDialProps) {
  const t = useTheme();
  const { cx, cy, r, stroke, size } = frame;
  // Beans sit a little inside the groove so its rim shows around them.
  const width = stroke - 6;
  const deg = (ts: number) => timeToDeg(Math.min(Math.max(ts, dayStart), dayEnd), dayStart, dayEnd);
  const nowDeg = now === null || now >= dayEnd ? null : deg(now);

  const outer = r + stroke / 2;
  const groove = [t.c.trackShade, t.c.track, t.c.track, t.c.trackRim];
  const groovePositions = [(r - stroke / 2) / outer, (r - stroke * 0.1) / outer, (r + stroke * 0.25) / outer, 1];

  const drawn = beans
    // A running bean shows from its first second, as a bead.
    .filter((b) => b.end > b.start || b.running)
    .map((b) => ({ ...b, shape: shapeOf(deg(b.start), deg(b.end), r, width), candy: t.candy[b.hue] }));
  const running = drawn.find((b) => b.running);

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* The groove, shaded like a candy ring, with a gloss along its upper left. */}
        <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={stroke}>
          <RadialGradient c={vec(cx, cy)} r={outer} colors={groove} positions={groovePositions} />
        </Circle>
        <Path
          path={arcPath(frame, 292, 46, r - stroke * 0.18)}
          style="stroke"
          strokeWidth={stroke * 0.16}
          strokeCap="round"
          color={t.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)'}
        />
        {/* The rest of today is still to come: paler. */}
        {nowDeg !== null && (
          <Path path={arcPath(frame, nowDeg, 540 - nowDeg)} style="stroke" strokeWidth={stroke + 1} color={t.c.bg} opacity={t.dark ? 0.6 : 0.5} />
        )}
        <SugarDots frame={frame} color={t.dark ? t.c.trackRim : t.c.trackShade} />

        {ignite && <RingFlash frame={frame} ignite={ignite} color={running?.candy.fill ?? t.c.pink} />}

        {drawn.map((b) => (
          <Bean key={b.key} frame={frame} shape={b.shape} width={width} candy={b.candy} selected={b.selected} haloColor={b.candy.ink} grow={b.running ? ignite : undefined} />
        ))}

        {/* With a running head, the pin sits right next to it, so it moves to the head's canvas to stay on top. */}
        {nowDeg !== null && !running && <NowPin frame={frame} deg={nowDeg} color={t.c.pinkDeep} ring={t.c.bg} />}
        {children}
      </Canvas>
      {running && (
        <Head frame={frame} shape={running.shape} width={width} candy={running.candy} ignite={ignite}>
          {nowDeg !== null && <NowPin frame={frame} deg={nowDeg} color={t.c.pinkDeep} ring={t.c.bg} />}
        </Head>
      )}
      {labels && <HourLabels frame={frame} color={t.c.faint} />}
    </View>
  );
}

/** Tiny sugar dots on the groove at every hour, bigger every six. */
function SugarDots({ frame, color }: { frame: DialFrame; color: string }) {
  return (
    <Group>
      {Array.from({ length: 24 }, (_, h) => {
        const p = polar(frame, h * 15 + 180);
        return <Circle key={h} cx={p.x} cy={p.y} r={h % 6 === 0 ? 2.1 : 1.3} color={color} />;
      })}
    </Group>
  );
}

interface BeanProps {
  frame: DialFrame;
  shape: Shape;
  width: number;
  candy: Candy;
  selected?: boolean;
  haloColor: string;
  /** Trims the bean while it pours in (the running bean during ignition). */
  grow?: SharedValue<number>;
}

/** One jelly bean or candy bead: colored shadow, tube shading and a gloss line. */
function Bean({ frame, shape, width, candy, selected, haloColor, grow }: BeanProps) {
  const { cx, cy, r } = frame;
  const end = useDerivedValue(() => (grow ? Math.min(1, grow.get() * 1.4) : 1));
  if (shape.kind === 'dot') {
    const p = polar(frame, shape.mid);
    const d = shape.diameter;
    return (
      <Group>
        {selected && <Circle cx={p.x} cy={p.y} r={d / 2 + 5} color={haloColor} opacity={0.35} />}
        <Circle cx={p.x} cy={p.y + 2} r={d / 2} color={candy.glow}>
          <BlurMask blur={2.5} style="normal" />
        </Circle>
        <Circle cx={p.x} cy={p.y} r={d / 2}>
          <RadialGradient c={vec(p.x - d * 0.14, p.y - d * 0.18)} r={d * 0.72} colors={[candy.light, candy.fill, candy.deep]} positions={[0, 0.5, 1]} />
        </Circle>
        <Circle cx={p.x - d * 0.16} cy={p.y - d * 0.18} r={Math.max(1, d * 0.14)} color="rgba(255,255,255,0.7)" />
      </Group>
    );
  }
  const outer = r + width / 2;
  const path = arcPath(frame, shape.from, shape.sweep);
  const glossInset = Math.min(shape.sweep / 2, pxToDeg(width * 0.1, r));
  const gloss = arcPath(frame, shape.from + glossInset, Math.max(0.01, shape.sweep - glossInset * 2), r + width * 0.16);
  const shade = [candy.deep, candy.fill, mix(candy.fill, candy.light, 0.65), candy.fill, mix(candy.fill, candy.deep, 0.55)];
  const positions = [(r - width / 2) / outer, (r - width * 0.18) / outer, (r + width * 0.12) / outer, (r + width * 0.34) / outer, 1];
  return (
    <Group>
      {selected && <Path path={path} style="stroke" strokeWidth={width + 9} strokeCap="round" color={haloColor} opacity={0.32} />}
      <Path path={path} style="stroke" strokeWidth={width} strokeCap="round" color={candy.glow} end={end} transform={[{ translateY: 2 }]}>
        <BlurMask blur={3} style="normal" />
      </Path>
      <Path path={path} style="stroke" strokeWidth={width} strokeCap="round" end={end}>
        <RadialGradient c={vec(cx, cy)} r={outer} colors={shade} positions={positions} />
      </Path>
      <Path path={gloss} style="stroke" strokeWidth={Math.max(1.5, width * 0.2)} strokeCap="round" color="rgba(255,255,255,0.55)" end={end} />
    </Group>
  );
}

interface HeadProps {
  frame: DialFrame;
  shape: Shape;
  width: number;
  candy: Candy;
  ignite?: SharedValue<number>;
  /** Drawn on top of the head, in the dial's coordinates. */
  children?: ReactNode;
}

/**
 * The running bean's head: a soft glow that breathes while the dial can be seen, and a
 * bright candy highlight. A square canvas around the head, big enough for the ripple.
 */
function Head({ frame, shape, width, candy, ignite, children }: HeadProps) {
  const reduced = useReducedMotion();
  const showing = useShowing();
  const p = polar(frame, shape.kind === 'bean' ? shape.head : shape.mid);
  // The ripple reaches 3.2 widths out, the glow's blur about as far.
  const reach = Math.ceil(width * 3.6);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced || !showing) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(pulse);
      pulse.set(0);
    };
  }, [pulse, reduced, showing]);
  const pop = useDerivedValue(() => {
    const g = ignite ? ignite.get() : 1;
    // Pops in late in the pour, overshoots, settles.
    if (g < 0.55) return 0;
    if (g < 0.8) return ((g - 0.55) / 0.25) * 1.35;
    return 1.35 - ((g - 0.8) / 0.2) * 0.35;
  });
  const glowR = useDerivedValue(() => width * (0.85 + pulse.get() * 0.35) * pop.get());
  const glowOpacity = useDerivedValue(() => 0.5 - pulse.get() * 0.18);
  const coreR = useDerivedValue(() => width * 0.2 * pop.get());
  const rippleR = useDerivedValue(() => width * (0.6 + (ignite ? ignite.get() : 1) * 2.6));
  const rippleOpacity = useDerivedValue(() => {
    const g = ignite ? ignite.get() : 1;
    return g >= 1 ? 0 : (1 - g) * 0.8;
  });
  return (
    <Canvas style={{ position: 'absolute', left: p.x - reach, top: p.y - reach, width: reach * 2, height: reach * 2 }}>
      <Group transform={[{ translateX: reach - p.x }, { translateY: reach - p.y }]}>
        <Circle cx={p.x} cy={p.y} r={rippleR} color={candy.fill} opacity={rippleOpacity} style="stroke" strokeWidth={3} />
        <Circle cx={p.x} cy={p.y} r={glowR} color={candy.light} opacity={glowOpacity}>
          <BlurMask blur={width * 0.6} style="normal" />
        </Circle>
        <Circle cx={p.x} cy={p.y} r={coreR} color="rgba(255,255,255,0.92)">
          <BlurMask blur={1.2} style="normal" />
        </Circle>
        {children}
      </Group>
    </Canvas>
  );
}

/** The whole groove blushes in the new color when a jelly lands. */
function RingFlash({ frame, ignite, color }: { frame: DialFrame; ignite: SharedValue<number>; color: string }) {
  const opacity = useDerivedValue(() => {
    const g = ignite.get();
    return g >= 1 ? 0 : Math.sin(Math.min(1, g * 1.6) * Math.PI) * 0.3;
  });
  return <Circle cx={frame.cx} cy={frame.cy} r={frame.r} style="stroke" strokeWidth={frame.stroke + 4} color={color} opacity={opacity} />;
}

/** A small pink pin just outside the groove at the current time. */
function NowPin({ frame, deg, color, ring }: { frame: DialFrame; deg: number; color: string; ring: string }) {
  const p = polar(frame, deg, frame.r + frame.stroke / 2 + 6);
  return (
    <Group>
      <Circle cx={p.x} cy={p.y} r={5} color={ring} />
      <Circle cx={p.x} cy={p.y} r={3.6} color={color} />
    </Group>
  );
}

const hourLabels = [0, 6, 12, 18];

function HourLabels({ frame, color }: { frame: DialFrame; color: string }) {
  return (
    <>
      {hourLabels.map((h) => {
        const p = polar(frame, h * 15 + 180, frame.r + frame.stroke / 2 + 12);
        return (
          <Text key={h} allowFontScaling={false} style={[styles.hour, { left: p.x - 14, top: p.y - 8, color }]}>
            {String(h).padStart(2, '0')}
          </Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  hour: { ...text.caption, position: 'absolute', width: 28, height: 16, lineHeight: 16, textAlign: 'center', fontSize: 11 },
});
