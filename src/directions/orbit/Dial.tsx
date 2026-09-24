import { BlurMask, Canvas, Circle, DashPathEffect, Group, Line, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { arcPath, type DialFrame, polar, timeToDeg } from './geometry';
import { alpha, font, sky } from './theme';

/** One block on the ring. */
export interface DialArc {
  key: string;
  start: number;
  end: number;
  color: string;
  /** The running entry: drawn as a comet with a pulsing head. */
  running?: boolean;
  /** Drawn at low opacity, e.g. while something else is being edited. */
  faded?: boolean;
}

interface DialProps {
  frame: DialFrame;
  dayStart: number;
  dayEnd: number;
  arcs: readonly DialArc[];
  /** Draws the now hand and splits the drawn past from the dotted future. Null for days that are over. */
  now: number | null;
  /** `mini` drops labels and minor ticks for small multiples. */
  detail?: 'full' | 'mini';
  /** Extra Skia layers drawn above the arcs (scrub markers, ignition, drag previews). */
  children?: ReactNode;
}

const GAP_DEG = 0.8;
const MIN_SWEEP = 0.9;

/**
 * The 24-hour ring: a dark band for the tracked past, a dotted hairline for the
 * future, blocks as glowing arcs and the running block as a comet.
 */
export function Dial({ frame, dayStart, dayEnd, arcs, now, detail = 'full', children }: DialProps) {
  const { cx, cy, r, stroke, size } = frame;
  const mini = detail === 'mini';
  const deg = (ts: number) => timeToDeg(ts, dayStart, dayEnd);
  const nowDeg = now === null ? null : deg(Math.min(Math.max(now, dayStart), dayEnd));
  const pastSweep = nowDeg === null ? 360 : nowDeg - 180;

  const drawn = arcs.map((arc) => {
    const a0 = deg(arc.start);
    const sweep = deg(arc.end) - a0;
    const inset = sweep > GAP_DEG * 3 ? GAP_DEG / 2 : 0;
    const shownSweep = Math.max(sweep - inset * 2, MIN_SWEEP);
    return { ...arc, a0: a0 + inset, sweep: shownSweep, path: arcPath(frame, a0 + inset, shownSweep) };
  });
  const running = drawn.find((a) => a.running && !a.faded);

  const ticks = Skia.Path.Make();
  const inner = r - stroke / 2 - 4;
  for (let h = 0; h < 24; h++) {
    const major = h % 6 === 0;
    if (mini && !major) continue;
    const len = major ? (mini ? 3 : 7) : 3.5;
    const a = polar(frame, h * 15 + 180, inner);
    const b = polar(frame, h * 15 + 180, inner - len);
    ticks.moveTo(a.x, a.y);
    ticks.lineTo(b.x, b.y);
  }

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        {/* The future: a dotted hairline. */}
        <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={mini ? 1 : 1.5} color={sky.tick}>
          <DashPathEffect intervals={mini ? [1.5, 3] : [1.5, 5]} />
        </Circle>
        {/* The past: a dark band where gaps stay visible. */}
        <Path path={arcPath(frame, 180, pastSweep)} style="stroke" strokeWidth={stroke} color={sky.track} />
        <Path path={ticks} style="stroke" strokeWidth={mini ? 1 : 1.25} color={sky.tick} strokeCap="round" />

        {/* Bloom under the arcs. */}
        <Group opacity={mini ? 0.5 : 0.75}>
          <BlurMask blur={stroke * (mini ? 0.9 : 0.85)} style="normal" respectCTM />
          {drawn.map((a) => (
            <Path
              key={`g${a.key}`}
              path={a.path}
              style="stroke"
              strokeWidth={stroke * 1.1}
              color={a.color}
              opacity={a.faded ? 0.15 : 1}
            />
          ))}
        </Group>
        {drawn.map((a) => (
          <Group key={a.key} opacity={a.faded ? 0.28 : 1}>
            <Path path={a.path} style="stroke" strokeWidth={stroke} color={a.color}>
              {a.running && (
                <SweepGradient
                  c={vec(cx, cy)}
                  colors={[alpha(a.color, 0.3), a.color]}
                  positions={[0, Math.max(a.sweep / 360, 0.001)]}
                  transform={[{ rotate: ((a.a0 - 90) * Math.PI) / 180 }]}
                  origin={vec(cx, cy)}
                />
              )}
            </Path>
            {!mini && (
              <Path path={a.path} style="stroke" strokeWidth={1.2} color="#FFFFFF" opacity={a.running ? 0.35 : 0.22} />
            )}
          </Group>
        ))}

        {running && <CometHead frame={frame} deg={running.a0 + running.sweep} color={running.color} mini={mini} />}
        {nowDeg !== null && !mini && <NowHand frame={frame} deg={nowDeg} />}
        {children}
      </Canvas>
      {!mini && <HourLabels frame={frame} />}
    </View>
  );
}

/** The running block's head: a bright core with a slow pulse of light. */
function CometHead({ frame, deg, color, mini }: { frame: DialFrame; deg: number; color: string; mini: boolean }) {
  const p = polar(frame, deg);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false));
  }, [pulse]);
  const haloR = useDerivedValue(() => frame.stroke * (0.7 + pulse.value * 1.3));
  const haloOpacity = useDerivedValue(() => 0.55 * (1 - pulse.value));
  const core = frame.stroke * (mini ? 0.55 : 0.6);

  return (
    <Group>
      <Circle cx={p.x} cy={p.y} r={haloR} color={color} opacity={haloOpacity} style="stroke" strokeWidth={mini ? 1 : 2} />
      <Circle cx={p.x} cy={p.y} r={core * 2.2} color={color} opacity={0.55}>
        <BlurMask blur={core * 1.6} style="normal" respectCTM />
      </Circle>
      <Circle cx={p.x} cy={p.y} r={core} color="#FFFFFF" />
    </Group>
  );
}

/** A short hand across the band at the current time. */
function NowHand({ frame, deg }: { frame: DialFrame; deg: number }) {
  const a = polar(frame, deg, frame.r - frame.stroke / 2 - 14);
  const b = polar(frame, deg, frame.r + frame.stroke / 2 + 7);
  return (
    <Group>
      <Line p1={vec(a.x, a.y)} p2={vec(b.x, b.y)} color={sky.accent} strokeWidth={4} opacity={0.35} strokeCap="round">
        <BlurMask blur={4} style="normal" respectCTM />
      </Line>
      <Line p1={vec(a.x, a.y)} p2={vec(b.x, b.y)} color={sky.accent} strokeWidth={1.75} strokeCap="round" />
      <Circle cx={b.x} cy={b.y} r={2.75} color={sky.accent} />
    </Group>
  );
}

const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21];

function HourLabels({ frame }: { frame: DialFrame }) {
  return (
    <>
      {hourLabels.map((h) => {
        const p = polar(frame, h * 15 + 180, frame.r + frame.stroke / 2 + 15);
        const major = h % 6 === 0;
        return (
          <Text
            key={h}
            style={[styles.hour, { left: p.x - 14, top: p.y - 7, color: major ? sky.dim : sky.faint }]}>
            {String(h).padStart(2, '0')}
          </Text>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  hour: {
    position: 'absolute',
    width: 28,
    height: 14,
    textAlign: 'center',
    fontFamily: font.mono,
    fontSize: 9.5,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
});
