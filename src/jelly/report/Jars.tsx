// Weekly targets as candy jars filling up with jelly: "Job jar 36:40 / 40:00".
// Reaching the target fills the jar to the brim with a little confetti burst.

import { Canvas, Circle, Group, LinearGradient, Path, RoundedRect, rect, rrect, Skia, vec } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { cancelAnimation, Easing, useDerivedValue, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from 'react-native-reanimated';

import { formatDuration, formatSignedDuration, type TargetLine } from '@/core';
import { weekText } from '@/i18n/week';

import { buzz, play } from '../feedback';
import { useShowing } from '../showing';
import { alpha, tabular, text, useTheme } from '../theme';
import { Squishy } from '../ui';
import { Confetti } from './Confetti';

const W = 96;
const H = 124;
const BODY = { x: 6, y: 26, w: W - 12, h: H - 30, r: 24 };

/** Jars already celebrated this session, so the confetti doesn't repeat on every visit. */
const celebrated = new Set<string>();

export function Jars({ lines, weekStart }: { lines: TargetLine[]; weekStart: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ overflow: 'visible' }}>
      {lines.map((line, i) => (
        <Jar key={line.context.id} line={line} weekStart={weekStart} delay={i * 120} />
      ))}
    </ScrollView>
  );
}

function Jar({ line, weekStart, delay }: { line: TargetLine; weekStart: number; delay: number }) {
  const t = useTheme();
  const c = t.candy[line.context.hue];
  const ratio = line.target > 0 ? Math.min(1, line.actual / line.target) : 0;
  const full = line.actual >= line.target;
  const level = useSharedValue(0);
  const phase = useSharedValue(0);
  const showing = useShowing();
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    level.set(withDelay(delay, withSpring(full ? 1.04 : ratio, { damping: 9, stiffness: 70 })));
  }, [delay, full, level, ratio]);
  // The jelly sloshes while Week shows.
  useEffect(() => {
    if (!showing) return;
    phase.set(withRepeat(withTiming(Math.PI * 2, { duration: 2600, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(phase);
      phase.set(0);
    };
  }, [phase, showing]);

  const key = `${line.context.id}:${weekStart}`;
  useEffect(() => {
    if (!full || celebrated.has(key)) return;
    celebrated.add(key);
    const timer = setTimeout(() => {
      setBurst(Date.now());
      buzz.success();
      play('plink');
    }, delay + 700);
    return () => clearTimeout(timer);
  }, [delay, full, key]);

  const inner = { x: BODY.x + 5, y: BODY.y + 5, w: BODY.w - 10, h: BODY.h - 10 };
  const clip = rrect(rect(inner.x, inner.y, inner.w, inner.h), BODY.r - 5, BODY.r - 5);
  const jelly = useDerivedValue(() => {
    const top = inner.y + inner.h * (1 - Math.min(1.08, level.get()));
    const b = Skia.PathBuilder.Make();
    b.moveTo(inner.x - 2, inner.y + inner.h + 2);
    for (let x = 0; x <= inner.w + 4; x += 4) {
      b.lineTo(inner.x - 2 + x, top + Math.sin(phase.get() + x / 11) * 2.4);
    }
    b.lineTo(inner.x + inner.w + 2, inner.y + inner.h + 2);
    b.close();
    return b.detach();
  });

  return (
    <Squishy
      grounded
      amount={0.08}
      onPress={() => {
        if (full) {
          setBurst(Date.now());
          play('plink');
        }
      }}
      accessibilityLabel={weekText.jarLabel(line.context.name, formatDuration(line.actual), formatDuration(line.target))}
      style={styles.jar}>
      <View style={{ width: W, height: H }}>
        <Canvas style={{ width: W, height: H }}>
          {/* Lid */}
          <RoundedRect x={16} y={4} width={W - 32} height={16} r={7}>
            <LinearGradient start={vec(0, 4)} end={vec(0, 20)} colors={[c.light, c.deep]} />
          </RoundedRect>
          <RoundedRect x={20} y={18} width={W - 40} height={10} r={3} color={alpha(t.c.ink, 0.1)} />
          {/* Glass */}
          <RoundedRect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} r={BODY.r} color={t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)'} />
          <Group clip={clip}>
            <Path path={jelly}>
              <LinearGradient start={vec(0, inner.y)} end={vec(0, inner.y + inner.h)} colors={[c.light, c.fill, c.deep]} />
            </Path>
            <Circle cx={inner.x + inner.w * 0.3} cy={inner.y + inner.h * 0.8} r={4} color="rgba(255,255,255,0.35)" />
            <Circle cx={inner.x + inner.w * 0.65} cy={inner.y + inner.h * 0.68} r={2.5} color="rgba(255,255,255,0.35)" />
          </Group>
          <RoundedRect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} r={BODY.r} style="stroke" strokeWidth={2.5} color={alpha(t.c.ink, t.dark ? 0.22 : 0.14)} />
          <RoundedRect x={BODY.x + 9} y={BODY.y + 14} width={6} height={BODY.h * 0.5} r={3} color="rgba(255,255,255,0.75)" />
        </Canvas>
        <Text style={styles.emoji}>{line.context.glyph ?? ''}</Text>
        <Confetti burst={burst} />
      </View>
      <Text style={[text.callout, styles.name, { color: t.c.ink }]} numberOfLines={1}>
        {line.context.name}
      </Text>
      <Text style={[text.subhead, tabular, { color: t.c.ink }]}>
        {formatDuration(line.actual)} <Text style={{ color: t.c.muted }}>/ {formatDuration(line.target)}</Text>
      </Text>
      <View style={[styles.diff, { backgroundColor: full ? t.candy.green.tint : t.c.sunken }]}>
        <Text style={[text.footnote, tabular, { color: full ? t.candy.green.ink : t.c.muted }]}>
          {full ? '★ ' : ''}
          {formatSignedDuration(line.diff)}
        </Text>
      </View>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 14, paddingTop: 6, paddingBottom: 4 },
  jar: { alignItems: 'center', width: W + 12 },
  emoji: { position: 'absolute', top: 46, alignSelf: 'center', fontSize: 26 },
  name: { marginTop: 6, maxWidth: W + 10 },
  diff: { marginTop: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
});
