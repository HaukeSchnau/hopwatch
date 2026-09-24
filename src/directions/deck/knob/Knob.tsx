import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  Path,
  RadialGradient,
  Skia,
  SweepGradient,
  vec,
} from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Print } from '../Body';
import { detent, endStop } from '../feedback';
import { body, led } from '../theme';

/** One detent is 5 minutes and 30°, so a full turn back is one hour, like a clock hand. */
const STEP_MINUTES = 5;
const STEP_ANGLE = Math.PI / 6;
const knobSpring = { damping: 16, stiffness: 260, mass: 0.7 };

interface KnobProps {
  /** Canvas size; the knob itself is about two thirds of it. */
  size: number;
  /** Minutes back from now. */
  value: number;
  max: number;
  onChange: (minutes: number) => void;
}

/**
 * A rotary encoder. Turning it counter-clockwise dials time back in 5-minute detents,
 * each with a haptic tick; it pulls towards the nearest detent while held and snaps
 * into it on release. The printed ring reads like a clock face turned backwards.
 */
export function Knob({ size, value, max, onChange }: KnobProps) {
  const c = size / 2;
  const radius = size * 0.31;
  const ring = size * 0.405;
  const maxSteps = Math.floor(max / STEP_MINUTES);

  const angle = useSharedValue(-(value / STEP_MINUTES) * STEP_ANGLE);
  const raw = useSharedValue(0);
  const lastTouch = useSharedValue(0);
  const current = useSharedValue(value / STEP_MINUTES);
  const dragging = useSharedValue(false);
  const pinned = useSharedValue(false);

  // Presets and SET TIME change the value from outside: follow with a spring.
  useEffect(() => {
    if (dragging.get()) return;
    current.set(value / STEP_MINUTES);
    angle.set(withSpring(-(value / STEP_MINUTES) * STEP_ANGLE, knobSpring));
  }, [value, angle, current, dragging]);

  const emit = (steps: number) => {
    detent();
    onChange(steps * STEP_MINUTES);
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((e) => {
      dragging.set(true);
      pinned.set(false);
      lastTouch.set(Math.atan2(e.y - c, e.x - c));
      raw.set(angle.get());
    })
    .onUpdate((e) => {
      const dx = e.x - c;
      const dy = e.y - c;
      // The angle is meaningless right at the centre.
      if (dx * dx + dy * dy < (radius * 0.22) ** 2) return;
      const a = Math.atan2(dy, dx);
      let d = a - lastTouch.get();
      if (d > Math.PI) d -= 2 * Math.PI;
      else if (d < -Math.PI) d += 2 * Math.PI;
      lastTouch.set(a);

      const lo = -maxSteps * STEP_ANGLE - STEP_ANGLE * 0.3;
      const hi = STEP_ANGLE * 0.3;
      const next = Math.max(lo, Math.min(hi, raw.get() + d));
      raw.set(next);
      const steps = Math.max(0, Math.min(maxSteps, Math.round(-next / STEP_ANGLE)));
      const snapped = -steps * STEP_ANGLE;
      angle.set(snapped + (next - snapped) * 0.45);
      if (steps !== current.get()) {
        current.set(steps);
        scheduleOnRN(emit, steps);
      }
      const atEnd = next <= lo + 1e-3 || next >= hi - 1e-3;
      if (atEnd && !pinned.get()) {
        pinned.set(true);
        scheduleOnRN(endStop);
      } else if (!atEnd) pinned.set(false);
    })
    .onFinalize(() => {
      dragging.set(false);
      angle.set(withSpring(-current.get() * STEP_ANGLE, knobSpring));
    });

  const rotation = useDerivedValue(() => [{ rotate: angle.get() }]);
  const arcRadius = ring - 12;
  const arc = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const sweep = Math.max(-359.9, (angle.get() * 180) / Math.PI);
    if (sweep < -0.5) {
      path.addArc({ x: c - arcRadius, y: c - arcRadius, width: arcRadius * 2, height: arcRadius * 2 }, -90, sweep);
    }
    return path;
  });

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6 - Math.PI / 2;
    const major = i % 3 === 0;
    const r1 = ring - (major ? 5 : 3);
    const r2 = ring + (major ? 5 : 3);
    return { key: i, p1: vec(c + r1 * Math.cos(a), c + r1 * Math.sin(a)), p2: vec(c + r2 * Math.cos(a), c + r2 * Math.sin(a)), major };
  });
  const knurls = Array.from({ length: 72 }, (_, i) => {
    const a = (i * Math.PI * 2) / 72;
    return {
      key: i,
      p1: vec(c + radius * 0.9 * Math.cos(a), c + radius * 0.9 * Math.sin(a)),
      p2: vec(c + radius * 0.995 * Math.cos(a), c + radius * 0.995 * Math.sin(a)),
    };
  });

  // Printed minute labels, counter-clockwise from the top: 0, 15, 30, 45.
  const labels = [
    { text: '0', a: -Math.PI / 2 },
    { text: '15', a: Math.PI },
    { text: '30', a: Math.PI / 2 },
    { text: '45', a: 0 },
  ];
  const labelRadius = ring + 16;

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }} accessibilityRole="adjustable" accessibilityLabel="Rewind knob">
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Printed scale */}
          <Circle cx={c} cy={c} r={ring} color="rgba(0,0,0,0.16)" style="stroke" strokeWidth={StyleSheet.hairlineWidth * 2} />
          {ticks.map((t) => (
            <Line key={t.key} p1={t.p1} p2={t.p2} color={t.major ? body.ink : body.ink3} strokeWidth={t.major ? 2 : 1.3} />
          ))}
          <Path path={arc} color={led.on} style="stroke" strokeWidth={4} strokeCap="round" />
          <Path path={arc} color={led.on} style="stroke" strokeWidth={4} strokeCap="round" opacity={0.6}>
            <BlurMask blur={5} style="normal" />
          </Path>

          {/* Shadow on the body */}
          <Circle cx={c} cy={c + 7} r={radius + 1}>
            <BlurMask blur={12} style="normal" />
            <RadialGradient c={vec(c, c + 7)} r={radius + 1} colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.2)']} />
          </Circle>
          {/* Side of the knob */}
          <Circle cx={c} cy={c + 3} r={radius} color="#8E897F" />
          {/* Top face: brushed metal, highlights fixed to the light */}
          <Circle cx={c} cy={c} r={radius}>
            <SweepGradient
              c={vec(c, c)}
              colors={['#F4F2EE', '#FFFFFF', '#C3BEB5', '#8F8A81', '#BDB8AF', '#FBFAF7', '#F4F2EE', '#A7A299', '#D8D4CC', '#F4F2EE']}
              positions={[0, 0.1, 0.22, 0.33, 0.44, 0.58, 0.68, 0.8, 0.9, 1]}
            />
          </Circle>
          <Group transform={rotation} origin={vec(c, c)}>
            {knurls.map((k) => (
              <Line key={k.key} p1={k.p1} p2={k.p2} color="rgba(40,36,30,0.28)" strokeWidth={1.2} />
            ))}
            <Line p1={vec(c, c - radius * 0.84)} p2={vec(c, c - radius * 0.6)} color={body.accent} strokeWidth={5} strokeCap="round" />
          </Group>
          {[0.5, 0.62, 0.74].map((f) => (
            <Circle key={f} cx={c} cy={c} r={radius * f} color="rgba(0,0,0,0.05)" style="stroke" strokeWidth={0.8} />
          ))}
          <Circle cx={c} cy={c} r={radius * 0.46}>
            <RadialGradient c={vec(c - radius * 0.12, c - radius * 0.14)} r={radius * 0.6} colors={['#FFFFFF', '#D9D5CD', '#B6B1A8']} />
          </Circle>
          <Circle cx={c} cy={c} r={radius * 0.46} color="rgba(0,0,0,0.12)" style="stroke" strokeWidth={1} />
        </Canvas>
        {labels.map((l) => (
          <View
            key={l.text}
            pointerEvents="none"
            style={[styles.label, { left: c + labelRadius * Math.cos(l.a) - 16, top: c + labelRadius * Math.sin(l.a) - 7 }]}>
            <Print size={9} weight="bold" color={l.text === '0' ? body.accent : body.ink2} style={styles.labelText}>
              {l.text === '0' ? 'NOW' : `−${l.text}`}
            </Print>
          </View>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', width: 32, height: 14, alignItems: 'center', justifyContent: 'center' },
  labelText: { textAlign: 'center' },
});
