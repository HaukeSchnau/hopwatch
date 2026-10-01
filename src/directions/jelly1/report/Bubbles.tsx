// Where the time went, as candy bubbles sized by time. Each bubble is a top-level
// context; tap one and it jiggles and opens its branch in the list below.

import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { type ContextId, formatDuration, type TotalsNode } from '@/core';

import { buzz } from '../feedback';
import { candy, fonts, springs } from '../theme';
import { CandySurface, Squishy } from '../ui';
import { pack } from './pack';

export function Bubbles({
  nodes,
  width,
  height,
  onPick,
}: {
  nodes: TotalsNode[];
  width: number;
  height: number;
  onPick: (id: ContextId) => void;
}) {
  const circles = pack(
    nodes.map((n) => n.total),
    width,
    height,
  );
  return (
    <View style={{ width, height }}>
      {nodes.map((n, i) => (
        <Bubble key={n.context.id} node={n} x={circles[i].x} y={circles[i].y} r={circles[i].r} onPick={onPick} />
      ))}
    </View>
  );
}

function Bubble({ node, x, y, r, onPick }: { node: TotalsNode; x: number; y: number; r: number; onPick: (id: ContextId) => void }) {
  const c = candy[node.context.hue];
  const jiggle = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + jiggle.get() }, { scaleY: 1 - jiggle.get() }],
  }));
  const big = r >= 44;
  const medium = r >= 28;
  return (
    <Animated.View style={[styles.bubble, { left: x - r, top: y - r, width: r * 2, height: r * 2 }, style]}>
      <Squishy
        haptic={false}
        amount={0}
        onPress={() => {
          buzz.tap();
          jiggle.set(withSequence(withTiming(0.14, { duration: 80 }), withTiming(-0.1, { duration: 90 }), withSpring(0, springs.wobble)));
          onPick(node.context.id);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${node.context.name}, ${formatDuration(node.total)}`}>
        <CandySurface hue={node.context.hue} radius={r} style={[styles.body, { width: r * 2, height: r * 2 }]}>
          {node.context.glyph ? <Text style={{ fontSize: Math.max(12, Math.min(30, r * 0.42)) }}>{node.context.glyph}</Text> : null}
          {big && (
            <Text style={[styles.name, { color: c.on }]} numberOfLines={1}>
              {node.context.name}
            </Text>
          )}
          {medium && <Text style={[styles.time, { color: c.on, fontSize: Math.min(20, r * 0.3) }]}>{formatDuration(node.total)}</Text>}
        </CandySurface>
      </Squishy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute' },
  body: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  name: { fontFamily: fonts.display, fontSize: 13, marginTop: -1, maxWidth: '86%' },
  time: { fontFamily: fonts.displayBold, fontVariant: ['tabular-nums'] },
});
