import { type Hue, useRunning } from '@/core';
import { MeshGradientView } from 'expo-mesh-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { meshColors, useTheme } from './theme';

// A slightly warped 3×3 grid; only the centre point is free to move.
const POINTS = [
  [0, 0],
  [0.5, 0],
  [1, 0],
  [0, 0.45],
  [0.58, 0.42],
  [1, 0.55],
  [0, 1],
  [0.45, 1],
  [1, 1],
];

interface Layer {
  id: number;
  key: string;
  colors: string[];
}

let nextLayerId = 0;

/** New rooms bloom in: a slow fade while the mesh settles from a slight zoom. */
function bloom() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 1.14 }] },
    animations: {
      opacity: withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }),
      transform: [{ scale: withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }) }],
    },
  };
}

/**
 * The room: a mesh gradient in the running context's hue behind everything. It drifts
 * slowly and blooms into the new hue on every switch. `hue` overrides the running
 * context (onboarding previews the chosen color); `still` turns off the drift.
 */
export function Ambient({ hue, still = false }: { hue?: Hue | null; still?: boolean }) {
  const running = useRunning();
  const theme = useTheme();
  const target = hue === undefined ? (running?.context.hue ?? null) : hue;
  const key = `${target ?? 'none'}:${theme.scheme}`;

  const [layers, setLayers] = useState<Layer[]>(() => [
    { id: nextLayerId++, key, colors: meshColors(target, theme.scheme) },
  ]);
  if (layers[layers.length - 1].key !== key) {
    setLayers([...layers.slice(-3), { id: nextLayerId++, key, colors: meshColors(target, theme.scheme) }]);
  }

  // Once the newest room has bloomed in, the ones underneath can go.
  useEffect(() => {
    if (layers.length < 2) return;
    const timer = setTimeout(() => setLayers((current) => current.slice(-1)), 1700);
    return () => clearTimeout(timer);
  }, [layers]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Drift still={still}>
        {layers.map((layer, index) => (
          <Animated.View key={layer.id} style={StyleSheet.absoluteFill} entering={index === 0 ? undefined : bloom}>
            <MeshGradientView style={StyleSheet.absoluteFill} columns={3} rows={3} colors={layer.colors} points={POINTS} />
          </Animated.View>
        ))}
      </Drift>
    </View>
  );
}

/** Slow, out-of-phase translate, rotate and scale, so the room never looks printed. */
function Drift({ still, children }: { still: boolean; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const a = useSharedValue(0.5);
  const b = useSharedValue(0.5);
  const moving = !still && !reduceMotion;

  useEffect(() => {
    if (!moving) return;
    a.set(withRepeat(withTiming(1, { duration: 17000, easing: Easing.inOut(Easing.sin) }), -1, true));
    b.set(withRepeat(withTiming(0, { duration: 23000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [moving, a, b]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (a.value - 0.5) * 50 },
      { translateY: (b.value - 0.5) * 40 },
      { rotate: `${(b.value - 0.5) * 12}deg` },
      { scale: 1.02 + a.value * 0.1 },
    ],
  }));

  return <Animated.View style={[styles.bleed, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  bleed: { position: 'absolute', top: '-18%', bottom: '-18%', left: '-30%', right: '-30%' },
});
