import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Small deterministic PRNG, so a given seed always draws the same circle. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable number from a string id. */
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * A hand-drawn loop around a w×h box: a wobbly, slightly tilted ellipse that
 * overshoots its start and doesn't close, like a pen circling a word.
 */
export function inkLoop(w: number, h: number, seed: number) {
  const rand = random(seed);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 3;
  const ry = h / 2 - 3;
  const start = -Math.PI * (0.62 + rand() * 0.2);
  const sweep = Math.PI * 2 * (1.08 + rand() * 0.08);
  const drift = (rand() - 0.35) * 0.1;
  const phase1 = rand() * Math.PI * 2;
  const phase2 = rand() * Math.PI * 2;
  const tilt = ((rand() - 0.5) * 6 * Math.PI) / 180;
  const steps = 64;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const theta = start + sweep * t;
    const r = 1 + 0.035 * Math.sin(2 * theta + phase1) + 0.02 * Math.sin(3 * theta + phase2) + drift * t;
    const x = rx * r * Math.cos(theta);
    const y = ry * r * Math.sin(theta);
    points.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)]);
  }

  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    length += Math.hypot(x1 - x0, y1 - y0);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const [lx, ly] = points[points.length - 1];
  d += ` L${lx.toFixed(1)} ${ly.toFixed(1)}`;
  return { d, length: length * 1.02 };
}

/** A hand-drawn underline across a w×h box: slightly bowed, rising a touch at the end. */
export function inkLine(w: number, h: number, seed: number) {
  const rand = random(seed);
  const y0 = h * (0.55 + rand() * 0.2);
  const y1 = h * (0.3 + rand() * 0.2);
  const bow = h * (0.25 + rand() * 0.25);
  const d = `M2 ${y0.toFixed(1)} Q${(w * 0.45).toFixed(1)} ${(y0 + bow).toFixed(1)} ${(w - 2).toFixed(1)} ${y1.toFixed(1)}`;
  return { d, length: w * 1.08 };
}

/**
 * A marker stroke under a word, drawn left to right on mount in a riso ink and
 * multiplied into the paper.
 */
export function InkUnderline({
  width,
  height = 12,
  seed,
  color,
  strokeWidth = 5,
  delay = 120,
}: {
  width: number;
  height?: number;
  seed: number;
  color: string;
  strokeWidth?: number;
  delay?: number;
}) {
  const { d, length } = inkLine(width, height, seed);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress, seed]);
  const stroke = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  return (
    <Svg width={width} height={height} pointerEvents="none" style={{ mixBlendMode: 'multiply' }}>
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[length, length]}
        animatedProps={stroke}
      />
    </Svg>
  );
}

/**
 * The ink circle drawn around the running word. It draws itself on mount, so give it
 * a new `key` (or seed) to draw it again on the next switch.
 */
export function InkCircle({
  width,
  height,
  seed,
  color,
  strokeWidth = 2.2,
  delay = 60,
  duration = 560,
  animate = true,
}: {
  width: number;
  height: number;
  seed: number;
  color: string;
  strokeWidth?: number;
  delay?: number;
  duration?: number;
  animate?: boolean;
}) {
  const { d, length } = inkLoop(width, height, seed);
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.45, 0.05, 0.25, 1) }));
  }, [animate, delay, duration, progress, seed]);

  const stroke = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  const echo = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));

  return (
    <Svg width={width} height={height} pointerEvents="none">
      <AnimatedPath
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={[length, length]}
        animatedProps={stroke}
      />
      <AnimatedPath
        d={d}
        transform="translate(0.9 0.7)"
        stroke={color}
        strokeWidth={strokeWidth * 0.45}
        strokeOpacity={0.55}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[length, length]}
        animatedProps={echo}
      />
    </Svg>
  );
}
