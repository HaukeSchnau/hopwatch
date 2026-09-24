import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  actions,
  type DayReport,
  type EntryId,
  formatClock,
  formatDuration,
  HOUR,
  MINUTE,
  type Segment,
  useNow,
} from '@/core';

import { numeric, useTheme } from '../theme';
import { GUTTER, HOUR_HEIGHT, snap, SNAP, TOP, tsAt, yAt } from './geometry';

interface TimelineProps {
  report: DayReport;
  selectedId: EntryId | null;
  onSelect: (id: EntryId | null) => void;
}

/**
 * One day as blocks on an hour ruler. Tap a block for its details, long-press to select
 * it and drag its edges (5-minute snaps with a haptic tick each). Dashed gaps and any
 * empty stretch ask "What was this?".
 */
export function Timeline({ report, selectedId, onSelect }: TimelineProps) {
  const theme = useTheme();
  const [dragging, setDragging] = useState(false);
  const dayStart = report.start;
  const now = Date.now();
  const isToday = now >= dayStart && now < report.end;
  const first = report.segments[0];
  const initialY = isToday
    ? yAt(now, dayStart) - 280
    : first
      ? yAt(first.start, dayStart) - 90
      : yAt(dayStart + 8 * HOUR, dayStart);
  const height = yAt(report.end, dayStart) + TOP + 24;
  const hours = Math.round((report.end - dayStart) / HOUR);
  const selected = report.segments.find((s) => s.entry.id === selectedId) ?? null;

  const tapEmpty = (y: number) => {
    if (selectedId) {
      onSelect(null);
      return;
    }
    const at = tsAt(y, dayStart);
    const gap = report.gaps.find((g) => g.start <= at && at < g.end);
    if (!gap) return;
    Haptics.selectionAsync();
    router.push({ pathname: '/glass/fill', params: { start: String(gap.start), end: String(gap.end), at: String(at) } });
  };

  return (
    <ScrollView
      key={dayStart}
      contentOffset={{ x: 0, y: Math.max(0, initialY) }}
      scrollEnabled={!dragging}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ height: height + 110 }}>
      <Pressable style={StyleSheet.absoluteFill} onPress={(e) => tapEmpty(e.nativeEvent.locationY)} />
      {Array.from({ length: hours + 1 }, (_, h) => {
        const ts = dayStart + h * HOUR;
        const y = yAt(ts, dayStart);
        // Like Calendar, the hour label steps aside for the now pill.
        const hidden = h === hours || (isToday && Math.abs(ts - now) < 14 * MINUTE);
        return (
          <View key={h} style={[styles.hour, { top: y }]} pointerEvents="none">
            <Text style={[styles.hourLabel, { color: theme.secondary }]}>{hidden ? '' : formatClock(ts)}</Text>
            <View style={[styles.hourLine, { backgroundColor: theme.separator }]} />
          </View>
        );
      })}
      {report.gaps.map((gap) => (
        <GapBox key={gap.start} gap={gap} report={report} />
      ))}
      {report.segments.map((segment) =>
        segment.entry.id === selectedId ? null : (
          <Block
            key={segment.entry.id}
            segment={segment}
            dayStart={dayStart}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSelect(segment.entry.id);
            }}
          />
        ),
      )}
      {isToday ? <NowLine dayStart={dayStart} /> : null}
      {selected ? <Selection segment={selected} report={report} onDragging={setDragging} /> : null}
    </ScrollView>
  );
}

const openEntry = (id: EntryId) => router.push({ pathname: '/glass/entry/[id]', params: { id } });

function Block({ segment, dayStart, onLongPress }: { segment: Segment; dayStart: number; onLongPress: () => void }) {
  const theme = useTheme();
  const hue = theme.hue(segment.context.hue);
  const top = yAt(segment.start, dayStart);
  const height = Math.max(3, yAt(segment.end, dayStart) - top);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${segment.context.name}, ${formatClock(segment.start)} to ${segment.running ? 'now' : formatClock(segment.end)}`}
      accessibilityHint="Opens the entry. Long-press to adjust its start and end."
      onPress={() => openEntry(segment.entry.id)}
      onLongPress={onLongPress}
      delayLongPress={320}
      hitSlop={height < 16 ? { top: 3, bottom: 3 } : undefined}
      style={({ pressed }) => [
        styles.block,
        { top: top + 1, height: Math.max(2, height - 2), backgroundColor: hue.block, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[styles.accent, { backgroundColor: hue.solid }]} />
      <BlockLabel segment={segment} height={height} color={hue.ink} meta={theme.secondary} />
      {segment.running ? <RunningEdge color={hue.solid} /> : null}
    </Pressable>
  );
}

/** Name, times and note, as much as the block's height allows. */
function BlockLabel({ segment, height, color, meta, times }: { segment: Segment; height: number; color: string; meta: string; times?: { start: number; end: number } }) {
  const start = times?.start ?? segment.start;
  const end = times?.end ?? segment.end;
  if (height < 18) return null;
  const name = `${segment.context.glyph ? `${segment.context.glyph} ` : ''}${segment.context.name}`;
  const range = `${formatClock(start)}–${segment.running && !times ? 'now' : formatClock(end)}`;
  if (height < 42) {
    return (
      <View style={styles.labelRow}>
        <Text style={[styles.blockName, styles.grow, { color, fontSize: height < 26 ? 12 : 14 }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[numeric, styles.blockMeta, { color: meta, fontSize: height < 26 ? 11 : 12 }]}>{formatDuration(end - start)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.labelStack}>
      <Text style={[styles.blockName, { color }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[numeric, styles.blockMeta, { color: meta }]} numberOfLines={1}>
        {range} · {formatDuration(end - start)}
      </Text>
      {segment.entry.note && height >= 64 ? (
        <Text style={[styles.note, { color: meta }]} numberOfLines={Math.floor((height - 44) / 17)}>
          {segment.entry.note}
        </Text>
      ) : null}
    </View>
  );
}

/** A soft pulse at the bottom of the running block: it's still growing. */
function RunningEdge({ color }: { color: string }) {
  return (
    <View style={styles.runningEdge} pointerEvents="none">
      <SymbolView name="circle.fill" size={8} tintColor={color} animationSpec={{ effect: { type: 'pulse' }, repeating: true }} />
    </View>
  );
}

function GapBox({ gap, report }: { gap: { start: number; end: number }; report: DayReport }) {
  const theme = useTheme();
  const length = gap.end - gap.start;
  const before = report.segments.some((s) => s.end <= gap.start);
  const after = report.segments.some((s) => s.start >= gap.end) || gap.end < report.end;
  // Only gaps between tracked blocks get the dashed treatment; nights stay quiet.
  if (!before || !after || length < 10 * MINUTE || length > 4 * HOUR) return null;
  const top = yAt(gap.start, report.start);
  const height = yAt(gap.end, report.start) - top;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Untracked, ${formatDuration(length)}. What was this?`}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({ pathname: '/glass/fill', params: { start: String(gap.start), end: String(gap.end) } });
      }}
      style={({ pressed }) => [
        styles.gap,
        { top: top + 2, height: height - 4, borderColor: theme.tertiary, backgroundColor: pressed ? theme.fill : 'transparent' },
      ]}>
      {height >= 20 ? (
        <View style={styles.gapLabel}>
          <SymbolView name="plus" size={11} weight="bold" tintColor={theme.secondary} />
          <Text style={[numeric, styles.gapText, { color: theme.secondary }]}>{formatDuration(length)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Calendar's red now-line, refreshed every half minute. */
function NowLine({ dayStart }: { dayStart: number }) {
  const now = useNow(30_000);
  const theme = useTheme();
  const red = theme.hue('red').solid;
  return (
    <View style={[styles.now, { top: yAt(now, dayStart) - 9 }]} pointerEvents="none">
      <View style={[styles.nowPill, { backgroundColor: red }]}>
        <Text style={[numeric, styles.nowText]}>{formatClock(now)}</Text>
      </View>
      <View style={[styles.nowLine, { backgroundColor: red }]} />
    </View>
  );
}

/**
 * The selected block, drawn solid with a handle on each free edge. Dragging a handle
 * moves that edge on the UI thread, ticks on every 5 minutes, and commits on release;
 * the domain trims whatever the new range overlaps.
 */
function Selection({ segment, report, onDragging }: { segment: Segment; report: DayReport; onDragging: (on: boolean) => void }) {
  const theme = useTheme();
  const hue = theme.hue(segment.context.hue);
  const dayStart = report.start;
  const startTs = useSharedValue(segment.start);
  const endTs = useSharedValue(segment.end);
  const origin = useSharedValue(0);
  const [live, setLive] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    startTs.set(segment.start);
    endTs.set(segment.end);
  }, [segment.start, segment.end, startTs, endTs]);

  const nowLimit = Math.min(Date.now(), report.end);
  const minStart = report.start;

  const tick = (start: number, end: number) => {
    Haptics.selectionAsync();
    setLive({ start, end });
  };
  const commit = (edge: 'start' | 'end', ts: number) => {
    onDragging(false);
    setLive(null);
    const name = segment.context.name;
    if (edge === 'start' && ts !== segment.start) actions.updateEntry(segment.entry.id, { startUtc: ts }, `${name} starts at ${formatClock(ts)}`);
    if (edge === 'end' && ts !== segment.end) actions.updateEntry(segment.entry.id, { endUtc: ts }, `${name} ends at ${formatClock(ts)}`);
  };

  const pan = (edge: 'start' | 'end') =>
    Gesture.Pan()
      .minDistance(0)
      .onBegin(() => {
        origin.value = edge === 'start' ? startTs.value : endTs.value;
        scheduleOnRN(onDragging, true);
      })
      .onUpdate((e) => {
        const raw = origin.value + (e.translationY / HOUR_HEIGHT) * 3_600_000;
        let next = snap(raw);
        if (edge === 'start') next = Math.min(Math.max(next, minStart), endTs.value - SNAP);
        else next = Math.max(Math.min(next, nowLimit), startTs.value + SNAP);
        const target = edge === 'start' ? startTs : endTs;
        if (next !== target.value) {
          target.value = next;
          scheduleOnRN(tick, startTs.value, endTs.value);
        }
      })
      .onFinalize(() => {
        scheduleOnRN(commit, edge, edge === 'start' ? startTs.value : endTs.value);
      });

  const frame = useAnimatedStyle(() => {
    const top = yAt(startTs.value, dayStart);
    return { top: top + 1, height: Math.max(6, yAt(endTs.value, dayStart) - top - 2) };
  });

  const times = live ?? { start: segment.start, end: segment.end };
  const height = yAt(times.end, dayStart) - yAt(times.start, dayStart);

  return (
    <Animated.View style={[styles.block, styles.selected, { backgroundColor: hue.solid, shadowColor: hue.solid }, frame]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => openEntry(segment.entry.id)} accessibilityRole="button" accessibilityLabel="Open entry" />
      <View pointerEvents="none" style={styles.selectedLabel}>
        <BlockLabel segment={segment} height={Math.max(height, 42)} color={hue.onSolid} meta={hue.onSolid} times={times} />
      </View>
      {segment.clippedStart ? null : (
        <GestureDetector gesture={pan('start')}>
          <View style={[styles.handleHit, styles.handleTop]} accessibilityLabel="Drag to change the start">
            <View style={[styles.knob, { borderColor: hue.solid }]} />
          </View>
        </GestureDetector>
      )}
      {segment.clippedEnd || segment.running ? null : (
        <GestureDetector gesture={pan('end')}>
          <View style={[styles.handleHit, styles.handleBottom]} accessibilityLabel="Drag to change the end">
            <View style={[styles.knob, { borderColor: hue.solid }]} />
          </View>
        </GestureDetector>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hour: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: 16, marginTop: -8 },
  hourLabel: { ...numeric, width: GUTTER, fontSize: 12, fontWeight: '500', textAlign: 'right', paddingRight: 10 },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  block: {
    position: 'absolute',
    left: GUTTER + 4,
    right: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingLeft: 12,
    paddingRight: 8,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  labelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelStack: { paddingTop: 6, gap: 1 },
  blockName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  grow: { flex: 1 },
  blockMeta: { fontSize: 12, fontWeight: '500' },
  note: { fontSize: 13, fontStyle: 'italic', marginTop: 2 },
  runningEdge: { position: 'absolute', right: 8, bottom: 6 },
  gap: {
    position: 'absolute',
    left: GUTTER + 4,
    right: 14,
    borderRadius: 10,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gapText: { fontSize: 12, fontWeight: '600' },
  now: { position: 'absolute', left: 0, right: 0, height: 18, flexDirection: 'row', alignItems: 'center' },
  nowPill: { width: GUTTER - 4, marginLeft: 2, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  nowText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  nowLine: { flex: 1, height: 2, borderRadius: 1 },
  selected: {
    overflow: 'visible',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 10,
  },
  selectedLabel: { flex: 1, overflow: 'hidden' },
  handleHit: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  handleTop: { top: -22, right: 18 },
  handleBottom: { bottom: -22, left: 18 },
  knob: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 3 },
});
