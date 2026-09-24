// The day as jelly beans on a vertical track. Beans are sized by duration; gaps are
// dotted "untracked" beans with a "+". Each bean has little round knobs on its ends:
// drag one to move that edge in 5-minute steps (the domain trims any neighbour).

import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { actions, type DayReport, formatClock, formatDuration, MINUTE, type Segment } from '@/core';

import { buzz } from '../feedback';
import { alpha, candy, colors, fonts } from '../theme';

export const PX_PER_MIN = 1.5;
export const GUTTER = 52;
const RIGHT = 14;
const STEP = 5 * MINUTE;
const KNOB = 44;

export interface Axis {
  start: number;
  end: number;
}

/** The visible hours: at least 06–22, stretched to cover every segment (and now, today). */
export function axisFor(report: DayReport, now: number): Axis {
  const hour = (t: number) => (t - report.start) / (60 * MINUTE);
  const times = report.segments.flatMap((s) => [s.start, s.end]);
  if (now >= report.start && now < report.end) times.push(now);
  const first = Math.min(6, ...times.map((t) => Math.floor(hour(t))));
  const last = Math.max(22, ...times.map((t) => Math.ceil(hour(t) + 0.25)));
  return {
    start: report.start + Math.max(0, first) * 60 * MINUTE,
    end: Math.min(report.end, report.start + Math.min(24, last) * 60 * MINUTE),
  };
}

export const yOf = (t: number, axis: Axis) => ((t - axis.start) / MINUTE) * PX_PER_MIN;

interface TimelineProps {
  report: DayReport;
  axis: Axis;
  now: number;
  width: number;
}

export function Timeline({ report, axis, now, width }: TimelineProps) {
  const height = yOf(axis.end, axis);
  const trackWidth = width - GUTTER - RIGHT;
  const hours: number[] = [];
  for (let t = axis.start; t <= axis.end; t += 60 * MINUTE) hours.push(t);
  const [active, setActive] = useState<string | null>(null);
  const isToday = now >= report.start && now < report.end;

  return (
    <View style={{ height: height + 30, marginTop: 12 }}>
      {hours.map((t) => (
        <View key={t} style={[styles.hourRow, { top: yOf(t, axis) }]} pointerEvents="none">
          <Text style={styles.hourLabel}>{formatClock(t).slice(0, 2)}</Text>
          <View style={styles.hourLine} />
        </View>
      ))}
      <View style={[styles.track, { height }]} pointerEvents="none" />
      {report.gaps.map((g) => {
        const start = Math.max(g.start, axis.start);
        const end = Math.min(g.end, axis.end);
        if (end - start < 2 * MINUTE) return null;
        return <GapBean key={`gap-${g.start}`} start={start} end={end} axis={axis} width={trackWidth} />;
      })}
      {report.segments.map((s) => (
        <Bean
          key={s.entry.id}
          seg={s}
          axis={axis}
          now={now}
          width={trackWidth}
          active={active === s.entry.id}
          onActive={(on) => setActive(on ? s.entry.id : null)}
        />
      ))}
      {isToday && <NowLine y={yOf(now, axis)} />}
    </View>
  );
}

function GapBean({ start, end, axis, width }: { start: number; end: number; axis: Axis; width: number }) {
  const top = yOf(start, axis);
  const h = yOf(end, axis) - top;
  const pad = h > 14 ? 3 : 1;
  return (
    <Pressable
      onPress={() => {
        buzz.tap();
        router.push({ pathname: '/jelly/pick', params: { mode: 'fill', from: String(start), to: String(end) } });
      }}
      hitSlop={{ top: Math.max(0, (24 - h) / 2), bottom: Math.max(0, (24 - h) / 2) }}
      accessibilityRole="button"
      accessibilityLabel={`Untracked ${formatClock(start)} to ${formatClock(end)}. What was this?`}
      style={({ pressed }) => [
        styles.gap,
        { top: top + pad, height: Math.max(2, h - pad * 2), width, borderRadius: Math.min(18, h / 2) },
        pressed && { backgroundColor: 'rgba(255,111,181,0.1)', borderColor: colors.pink },
      ]}>
      {h >= 22 && (
        <Text style={styles.gapText} numberOfLines={1}>
          + untracked {formatDuration(end - start)}
        </Text>
      )}
    </Pressable>
  );
}

interface BeanProps {
  seg: Segment;
  axis: Axis;
  now: number;
  width: number;
  active: boolean;
  onActive: (active: boolean) => void;
}

function Bean({ seg, axis, now, width, active, onActive }: BeanProps) {
  const c = candy[seg.context.hue];
  // While an edge is dragged, these hold the snapped time; NaN otherwise.
  const dragStart = useSharedValue(Number.NaN);
  const dragEnd = useSharedValue(Number.NaN);
  useEffect(() => {
    dragStart.set(Number.NaN);
  }, [dragStart, seg.start]);
  useEffect(() => {
    dragEnd.set(Number.NaN);
  }, [dragEnd, seg.end]);

  const axisStart = axis.start;
  const frame = useAnimatedStyle(() => {
    const s = Number.isNaN(dragStart.get()) ? seg.start : dragStart.get();
    const e = Number.isNaN(dragEnd.get()) ? seg.end : dragEnd.get();
    const top = ((s - axisStart) / MINUTE) * PX_PER_MIN;
    return { top, height: Math.max(4, ((e - s) / MINUTE) * PX_PER_MIN - 2) };
  });

  const h = ((seg.end - seg.start) / MINUTE) * PX_PER_MIN - 2;
  const radius = Math.min(20, h / 2);
  const roomy = h >= 30;
  const compact = !roomy && h >= 16;
  const running = seg.running;
  // Crumbs shorter than ~8 minutes get no knobs; they'd only cover their neighbours.
  // Their times are still editable in the entry detail.
  const grabbable = h >= 12;

  return (
    <>
      <Animated.View style={[styles.bean, { width, zIndex: active ? 5 : 1 }, frame]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => router.push({ pathname: '/jelly/entry', params: { id: seg.entry.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${seg.context.name}, ${formatClock(seg.start)} to ${running ? 'now' : formatClock(seg.end)}, ${formatDuration(seg.end - seg.start)}`}>
          <View
            style={[
              styles.beanBody,
              {
                backgroundColor: c.fill,
                borderRadius: radius,
                borderTopLeftRadius: seg.clippedStart ? 4 : radius,
                borderTopRightRadius: seg.clippedStart ? 4 : radius,
                borderBottomLeftRadius: seg.clippedEnd ? 4 : radius,
                borderBottomRightRadius: seg.clippedEnd ? 4 : radius,
                shadowColor: c.deep,
              },
              active && { shadowOpacity: 0.5, shadowRadius: 12 },
            ]}>
            <LinearGradient
              colors={[c.light, c.fill, c.deep]}
              locations={[0, 0.3, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.3 }}
              style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
            />
            {h > 12 && <View style={[styles.gloss, { top: Math.min(6, h * 0.2), bottom: Math.min(6, h * 0.2), borderRadius: 99 }]} />}
            {roomy ? (
              <View style={styles.beanContent}>
                <View style={styles.beanRow}>
                  {seg.context.glyph ? <Text style={styles.beanEmoji}>{seg.context.glyph}</Text> : null}
                  <Text style={[styles.beanName, { color: c.on }]} numberOfLines={1}>
                    {seg.context.name}
                  </Text>
                  <Text style={[styles.beanTime, { color: c.on }]}>{formatDuration(seg.end - seg.start)}</Text>
                </View>
                {h >= 54 ? (
                  <Text style={[styles.beanSub, { color: c.on }]} numberOfLines={Math.max(1, Math.floor((h - 36) / 17))}>
                    {formatClock(seg.start)}–{running ? 'now' : formatClock(seg.end)}
                    {seg.entry.note ? ` · ${seg.entry.note}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : compact ? (
              <View style={[styles.beanRow, styles.beanCompact]}>
                {seg.context.glyph ? <Text style={styles.beanEmojiSmall}>{seg.context.glyph}</Text> : null}
                <Text style={[styles.beanNameSmall, { color: c.on }]} numberOfLines={1}>
                  {seg.context.name} · {formatDuration(seg.end - seg.start)}
                </Text>
              </View>
            ) : null}
            {running && <RunningDrip color={c.light} />}
          </View>
        </Pressable>
      </Animated.View>
      {grabbable && !seg.clippedStart && (
        <Knob edge="start" seg={seg} axis={axis} now={now} drag={dragStart} other={dragEnd} x={GUTTER + width - 74} onActive={onActive} />
      )}
      {grabbable && !seg.clippedEnd && !running && (
        <Knob edge="end" seg={seg} axis={axis} now={now} drag={dragEnd} other={dragStart} x={GUTTER + width - 34} onActive={onActive} />
      )}
    </>
  );
}

/** A soft pulse at the bottom of the running bean: it's still growing. */
function RunningDrip({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.get() * 0.55 }));
  return <Animated.View style={[styles.drip, { backgroundColor: color }, style]} />;
}

interface KnobProps {
  edge: 'start' | 'end';
  seg: Segment;
  axis: Axis;
  now: number;
  drag: SharedValue<number>;
  other: SharedValue<number>;
  x: number;
  onActive: (active: boolean) => void;
}

function Knob({ edge, seg, axis, now, drag, other, x, onActive }: KnobProps) {
  const c = candy[seg.context.hue];
  const origin = edge === 'start' ? seg.start : seg.end;
  const [label, setLabel] = useState<string | null>(null);
  const lift = useSharedValue(0);
  const axisStart = axis.start;
  const segStart = seg.start;
  const segEnd = seg.running ? now : seg.end;

  const commit = (t: number) => {
    setLabel(null);
    onActive(false);
    if (t === origin) return;
    actions.updateEntry(
      seg.entry.id,
      edge === 'start' ? { startUtc: t } : { endUtc: t },
      `${seg.context.name} ${edge === 'start' ? 'starts' : 'ends'} at ${formatClock(t)}`,
    );
  };
  const moved = (t: number) => {
    buzz.tick();
    setLabel(formatClock(t));
  };
  const begin = () => {
    buzz.squish();
    onActive(true);
    setLabel(formatClock(origin));
  };

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((_, manager) => manager.activate())
    .onStart(() => {
      lift.set(withTiming(1, { duration: 120 }));
      scheduleOnRN(begin);
    })
    .onUpdate((e) => {
      const raw = origin + (e.translationY / PX_PER_MIN) * MINUTE;
      let t = Math.abs(raw - origin) < STEP / 2 ? origin : Math.round(raw / STEP) * STEP;
      if (edge === 'start') {
        const otherEnd = Number.isNaN(other.get()) ? segEnd : other.get();
        t = Math.min(t, otherEnd - STEP, now);
      } else {
        const otherStart = Number.isNaN(other.get()) ? segStart : other.get();
        t = Math.min(Math.max(t, otherStart + STEP), now);
      }
      const current = Number.isNaN(drag.get()) ? origin : drag.get();
      if (t !== current) {
        drag.set(t);
        scheduleOnRN(moved, t);
      }
    })
    .onEnd(() => {
      scheduleOnRN(commit, Number.isNaN(drag.get()) ? origin : drag.get());
    })
    .onFinalize(() => {
      lift.set(withTiming(0, { duration: 160 }));
    });

  const style = useAnimatedStyle(() => {
    const t = Number.isNaN(drag.get()) ? origin : drag.get();
    const s = 1 + lift.get() * 0.35;
    return { top: ((t - axisStart) / MINUTE) * PX_PER_MIN - KNOB / 2, transform: [{ scale: s }] };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.knobHit, { left: x - KNOB / 2 }, style]}
        accessibilityRole="adjustable"
        accessibilityLabel={`${edge === 'start' ? 'Start' : 'End'} of ${seg.context.name}, ${formatClock(origin)}`}>
        <View style={[styles.knob, { borderColor: c.deep }]} />
        {label && (
          <View style={[styles.bubble, { backgroundColor: colors.ink }]}>
            <Text style={styles.bubbleText}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

function NowLine({ y }: { y: number }) {
  return (
    <View pointerEvents="none" style={[styles.nowRow, { top: y - 9 }]}>
      <View style={styles.nowPill}>
        <Text style={styles.nowText}>now</Text>
      </View>
      <View style={styles.nowLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: 16, marginTop: -8 },
  hourLabel: { width: GUTTER - 10, textAlign: 'right', fontFamily: fonts.display, fontSize: 13, color: colors.faint, fontVariant: ['tabular-nums'] },
  hourLine: { flex: 1, height: 1, marginLeft: 10, marginRight: RIGHT, backgroundColor: alpha(colors.ink, 0.06) },
  track: { position: 'absolute', left: GUTTER - 1, width: 3, borderRadius: 2, backgroundColor: alpha(colors.ink, 0.05) },
  gap: {
    position: 'absolute',
    left: GUTTER,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: alpha(colors.ink, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapText: { fontFamily: fonts.display, fontSize: 13, color: colors.faint },
  bean: { position: 'absolute', left: GUTTER },
  beanBody: {
    flex: 1,
    overflow: 'visible',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  gloss: { position: 'absolute', left: 7, width: 5, backgroundColor: 'rgba(255,255,255,0.4)' },
  beanContent: { paddingLeft: 18, paddingRight: 14, paddingTop: 5 },
  beanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  beanCompact: { flex: 1, paddingLeft: 16, paddingRight: 12 },
  beanEmoji: { fontSize: 16 },
  beanEmojiSmall: { fontSize: 11 },
  beanName: { flex: 1, fontFamily: fonts.display, fontSize: 16 },
  beanNameSmall: { flex: 1, fontFamily: fonts.display, fontSize: 12 },
  beanTime: { fontFamily: fonts.display, fontSize: 15, fontVariant: ['tabular-nums'], opacity: 0.95, marginRight: 60 },
  beanSub: { fontFamily: fonts.textBold, fontSize: 13, lineHeight: 17, opacity: 0.85, marginTop: 1 },
  drip: { position: 'absolute', left: 14, right: 14, bottom: 3, height: 4, borderRadius: 2 },
  knobHit: { position: 'absolute', width: KNOB, height: KNOB, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  bubble: { position: 'absolute', right: KNOB - 4, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  bubbleText: { fontFamily: fonts.display, fontSize: 15, color: colors.white, fontVariant: ['tabular-nums'] },
  nowRow: { position: 'absolute', left: 4, right: 0, flexDirection: 'row', alignItems: 'center', height: 18, zIndex: 20 },
  nowPill: { backgroundColor: colors.pink, borderRadius: 9, paddingHorizontal: 7, height: 18, justifyContent: 'center' },
  nowText: { fontFamily: fonts.displayBold, fontSize: 11, color: colors.white },
  nowLine: { flex: 1, height: 2.5, backgroundColor: colors.pink, marginRight: RIGHT, borderRadius: 2 },
});
