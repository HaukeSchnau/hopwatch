import { Canvas, Circle, Group, RadialGradient, Rect, vec } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { sky } from './theme';

/** Deterministic pseudo-random numbers (mulberry32), so the sky never reshuffles. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = rng(7);
const stars = Array.from({ length: 150 }, () => ({
  x: random(),
  y: random(),
  r: 0.35 + random() ** 3 * 1.15,
  o: 0.08 + random() ** 2 * 0.45,
}));

/**
 * The night sky behind every Orbit screen: a faint star field and a soft nebula
 * glow near the dial, tinted by the running context.
 */
export function Starfield({ tint }: { tint?: string | null }) {
  const { width, height } = useWindowDimensions();
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color={sky.bg} />
      <Rect x={0} y={0} width={width} height={height * 0.7}>
        <RadialGradient
          c={vec(width / 2, height * 0.26)}
          r={width * 0.85}
          colors={[`${tint ?? '#3A4A8C'}${tint ? '24' : '1C'}`, '#07080C00']}
        />
      </Rect>
      <Group>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x * width} cy={s.y * height} r={s.r} color="#CFD8FF" opacity={s.o} />
        ))}
      </Group>
    </Canvas>
  );
}
