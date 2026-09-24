// The Day: one day as a ledger column. Times run down the margin, entries are riso
// blocks, gaps are dotted leaders asking "what was this?". Hold a block's tab and drag
// to move its start or end; tap a block for the entry page.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  addDays,
  type EntryId,
  formatClock,
  formatDuration,
  type GapSegment,
  HOUR,
  MINUTE,
  type Segment,
  useDayReport,
  useNow,
  useStint,
} from '@/core';

import { dayParam } from './dates';
import { PageHeader } from './PageHeader';
import { Paper } from './Paper';
import { font, ink, margin, paper, riso } from './theme';
import { InkLink, Leader } from './type';
import { formatDateline } from './words';

/** Points per minute: an hour is 96 pt, the whole day about 2300 pt. */
const PX = 1.6;
const GUTTER = 50;
const SNAP = 5 * MINUTE;
const MIN_LENGTH = 5 * MINUTE;
/** Gaps this long read as the night, not as something forgotten. */
const LONG_GAP = 4 * HOUR;

interface Drag {
  id: EntryId;
  edge: 'start' | 'end';
  value: number;
}

export function DayPage({ day }: { day: number }) {
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);
  const report = useDayReport(day);
  const scrollRef = useRef<ScrollView>(null);
  const [timelineTop, setTimelineTop] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [width, setWidth] = useState(0);

  const dayEnd = addDays(day, 1);
  const isToday = now >= day && now < dayEnd;
  const height = ((dayEnd - day) / MINUTE) * PX;
  const y = (ts: number) => ((ts - day) / MINUTE) * PX;
  const blockLeft = GUTTER + 8;
  const blockWidth = Math.max(0, width - blockLeft);

  // Open near the action: a few hours before now today, else the day's first entry.
  // Only once per day shown, not on every entry edit.
  const scrolledFor = useRef<number | null>(null);
  const focus = isToday
    ? Math.min(report.segments[0]?.start ?? now, now - 3 * HOUR)
    : (report.segments[0]?.start ?? day + 8 * HOUR);
  useEffect(() => {
    if (timelineTop === null || scrolledFor.current === day) return;
    scrolledFor.current = day;
    const offset = ((Math.max(day, focus) - day) / MINUTE) * PX;
    scrollRef.current?.scrollTo({ y: Math.max(0, timelineTop + offset - 90), animated: false });
  }, [timelineTop, day, focus]);

  const preview = (s: Segment) => {
    if (drag?.id === s.entry.id) {
      return drag.edge === 'start' ? { start: drag.value, end: s.end } : { start: s.start, end: drag.value };
    }
    const dragged = drag && report.segments.find((d) => d.entry.id === drag.id);
    if (!drag || !dragged) return { start: s.start, end: s.end };
    const from = drag.edge === 'start' ? drag.value : dragged.start;
    const to = drag.edge === 'end' ? drag.value : dragged.end;
    if (s.end <= from || s.start >= to) return { start: s.start, end: s.end };
    if (s.start >= from && s.end <= to) return { start: s.start, end: s.end, struck: true };
    return s.start < from ? { start: s.start, end: from } : { start: to, end: s.end };
  };

  // The ref holds the live drag for gesture callbacks, which may outlive a render.
  const dragRef = useRef<Drag | null>(null);
  const moveDrag = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };
  const commit = () => {
    const d = dragRef.current;
    moveDrag(null);
    const entry = d && useStint.getState().entries.find((e) => e.id === d.id);
    if (!d || !entry) return;
    if ((d.edge === 'start' ? entry.startUtc : entry.endUtc) === d.value) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const name = useStint.getState().tree.byId.get(entry.contextId)?.name ?? 'Entry';
    actions.updateEntry(
      d.id,
      d.edge === 'start' ? { startUtc: d.value } : { endUtc: d.value },
      `${name} now ${d.edge === 'start' ? 'starts' : 'ends'} at ${formatClock(d.value)}`,
    );
  };

  const hours = Array.from({ length: 25 }, (_, h) => new Date(day).setHours(h, 0, 0, 0)).filter(
    (ts, i, all) => i === 0 || ts !== all[i - 1],
  );
  const { blocks, median } = report.fragmentation;

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView
        ref={scrollRef}
        scrollEnabled={drag === null}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 90, paddingHorizontal: margin }}>
        <PageHeader title="The Day" folio="p. 2" />
        <View style={styles.dateRow}>
          <DayArrow label="Previous day" glyph="‹" onPress={() => router.setParams({ date: dayParam(addDays(day, -1)) })} />
          <Text style={styles.date} numberOfLines={1} adjustsFontSizeToFit>
            {formatDateline(day)}
          </Text>
          <DayArrow
            label="Next day"
            glyph="›"
            disabled={isToday || day > now}
            onPress={() => router.setParams({ date: dayParam(addDays(day, 1)) })}
          />
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {report.totals.total > 0 ? (
              <>
                <Text style={styles.summaryFigure}>{formatDuration(report.totals.total)}</Text> on the record ·{' '}
                {blocks} {blocks === 1 ? 'block' : 'blocks'} · median {formatDuration(median)}
              </>
            ) : (
              'Nothing on the record. Tap the page to add something you did.'
            )}
          </Text>
          <View style={styles.summaryLinks}>
            {!isToday && (
              <InkLink textStyle={styles.smallLink} onPress={() => router.setParams({ date: dayParam(now) })}>
                Today
              </InkLink>
            )}
            <InkLink
              textStyle={styles.smallLink}
              onPress={() => router.push({ pathname: '/almanac/week', params: { mode: 'day', date: dayParam(day) } })}>
              Totals →
            </InkLink>
          </View>
        </View>

        <View
          style={[styles.timeline, { height }]}
          onLayout={(e) => {
            setWidth(e.nativeEvent.layout.width);
            setTimelineTop(e.nativeEvent.layout.y);
          }}>
          {hours.map((ts) => (
            <View key={ts} style={[styles.hour, { top: y(ts) }]} pointerEvents="none">
              <Text style={styles.hourLabel}>{formatClock(ts)}</Text>
              <View style={styles.hourRule} />
            </View>
          ))}

          {drag === null &&
            report.gaps.map((gap) => (
              <Gap key={gap.start} gap={gap} top={y(gap.start)} height={y(gap.end) - y(gap.start)} left={blockLeft} />
            ))}

          {width > 0 &&
            report.segments.map((s) => {
              const p = preview(s);
              return (
                <Block
                  key={s.entry.id}
                  segment={s}
                  top={y(p.start)}
                  height={Math.max(2, y(p.end) - y(p.start))}
                  start={p.start}
                  end={p.end}
                  left={blockLeft}
                  width={blockWidth}
                  lifted={drag?.id === s.entry.id}
                  struck={'struck' in p}
                />
              );
            })}

          {isToday && <View style={[styles.future, { top: y(now) }]} pointerEvents="none" />}
          {isToday && (
            <View style={[styles.now, { top: y(now) }]} pointerEvents="none">
              <Text style={styles.nowLabel}>{formatClock(now)}</Text>
              <View style={styles.nowRule} />
            </View>
          )}

          {width > 0 &&
            report.segments.flatMap((s) => {
              const p = preview(s);
              const handles = [];
              if (!s.clippedStart)
                handles.push(
                  <Handle
                    key={`${s.entry.id}-start`}
                    x={blockLeft + 10}
                    y={y(p.start)}
                    value={p.start}
                    min={day}
                    max={p.end - MIN_LENGTH}
                    active={drag?.id === s.entry.id && drag.edge === 'start'}
                    onDrag={(value) => moveDrag({ id: s.entry.id, edge: 'start', value })}
                    onCommit={commit}
                    onCancel={() => moveDrag(null)}
                    onTap={() => router.push(`/almanac/entry/${s.entry.id}`)}
                  />,
                );
              if (!s.running && !s.clippedEnd)
                handles.push(
                  <Handle
                    key={`${s.entry.id}-end`}
                    x={blockLeft + blockWidth - HANDLE_HIT - 10}
                    y={y(p.end)}
                    value={p.end}
                    min={p.start + MIN_LENGTH}
                    max={Math.min(dayEnd, now)}
                    active={drag?.id === s.entry.id && drag.edge === 'end'}
                    onDrag={(value) => moveDrag({ id: s.entry.id, edge: 'end', value })}
                    onCommit={commit}
                    onCancel={() => moveDrag(null)}
                    onTap={() => router.push(`/almanac/entry/${s.entry.id}`)}
                  />,
                );
              return handles;
            })}
        </View>
        <Text style={styles.foot}>Hold a tab on a block’s edge and drag to move it. Tap a gap to fill it in.</Text>
      </ScrollView>
    </View>
  );
}

function DayArrow({ glyph, label, onPress, disabled }: { glyph: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.arrow, disabled && { opacity: 0.2 }, pressed && { opacity: 0.5 }]}>
      <Text style={styles.arrowText}>{glyph}</Text>
    </Pressable>
  );
}

/**
 * An entry as a printed block: a light screen of its ink, a solid ink bar down the
 * left edge set slightly off register, and a black rule along the top. Labels are
 * set in black ink and shrink with the block, disappearing below 12 pt.
 */
function Block({
  segment,
  top,
  height,
  start,
  end,
  left,
  width,
  lifted,
  struck,
}: {
  segment: Segment;
  top: number;
  height: number;
  start: number;
  end: number;
  left: number;
  width: number;
  lifted: boolean;
  struck: boolean;
}) {
  const { context, entry, running } = segment;
  const label = `${context.glyph ? `${context.glyph} ` : ''}${context.name}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${context.name}, ${formatClock(start)} to ${running ? 'now' : formatClock(end)}`}
      onPress={() => router.push(`/almanac/entry/${entry.id}`)}
      style={({ pressed }) => [
        styles.block,
        { top, height, left, width },
        lifted && styles.lifted,
        struck && { opacity: 0.25 },
        pressed && { opacity: 0.6 },
      ]}>
      <View style={[styles.tint, { backgroundColor: riso[context.hue].fill }, lifted && { opacity: 0.4 }]} />
      <View style={[styles.inkBar, { backgroundColor: riso[context.hue].fill }]} />
      <View style={[styles.topRule, segment.clippedStart && styles.ruleClipped]} />
      {running && <View style={styles.runningEdge} />}
      {height >= 44 ? (
        <View style={styles.blockInner}>
          <View style={styles.blockRow}>
            <Text style={styles.blockName} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.blockFigure}>{formatDuration(end - start)}</Text>
          </View>
          <Text style={styles.blockTimes} numberOfLines={1}>
            {formatClock(start)}–{running ? 'now' : formatClock(end)}
            {entry.note ? <Text style={styles.blockNote}>{`  ${entry.note}`}</Text> : null}
          </Text>
        </View>
      ) : height >= 20 ? (
        <View style={[styles.blockRow, styles.blockInnerTight]}>
          <Text style={[styles.blockName, { fontSize: 17 }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.blockFigure}>{formatDuration(end - start)}</Text>
        </View>
      ) : height >= 12 ? (
        <Text style={styles.blockTiny} numberOfLines={1}>
          {context.name} · {formatDuration(end - start)}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Untracked time: a dotted leader with its length, and an invitation to fill it. */
function Gap({ gap, top, height, left }: { gap: GapSegment; top: number; height: number; left: number }) {
  const length = gap.end - gap.start;
  const night = length >= LONG_GAP;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatDuration(length)} untracked, from ${formatClock(gap.start)}. Fill it in`}
      onPress={(e) => {
        Haptics.selectionAsync();
        const at = gap.start + (e.nativeEvent.locationY / PX) * MINUTE;
        router.push({
          pathname: '/almanac/pick',
          params: { for: 'gap', from: String(gap.start), to: String(gap.end), at: String(Math.round(at)) },
        });
      }}
      style={({ pressed }) => [styles.gap, { top, height, left }, pressed && { backgroundColor: 'rgba(28,26,23,0.05)' }]}>
      {height >= 26 ? (
        <View style={styles.gapRow}>
          <Leader />
          <Text style={styles.gapText}>
            {formatDuration(length)} {night ? 'off the record' : 'untracked.'}{' '}
            {!night && <Text style={styles.gapAsk}>What was this?</Text>}
          </Text>
          <Leader />
        </View>
      ) : height >= 10 ? (
        <View style={styles.gapRow}>
          <Leader />
        </View>
      ) : null}
    </Pressable>
  );
}

const HANDLE_HIT = 44;

/**
 * A tab on a block's edge. Hold it briefly, then drag: the edge snaps to five minutes
 * with a tick of the haptic at each step. A plain tap opens the entry instead.
 */
function Handle({
  x,
  y,
  value,
  min,
  max,
  active,
  onDrag,
  onCommit,
  onCancel,
  onTap,
}: {
  x: number;
  y: number;
  value: number;
  min: number;
  max: number;
  active: boolean;
  onDrag: (value: number) => void;
  onCommit: () => void;
  onCancel: () => void;
  onTap: () => void;
}) {
  const origin = useRef(value);
  const last = useRef(value);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(220)
    .onStart(() => {
      origin.current = value;
      last.current = value;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDrag(value);
    })
    .onUpdate((e) => {
      const raw = origin.current + (e.translationY / PX) * MINUTE;
      const snapped = Math.min(max, Math.max(min, Math.round(raw / SNAP) * SNAP));
      if (snapped === last.current) return;
      last.current = snapped;
      Haptics.selectionAsync();
      onDrag(snapped);
    })
    .onEnd((_e, success) => (success ? onCommit() : onCancel()));
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((_e, success) => success && onTap());

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View style={[styles.handle, { left: x, top: y - 15 }]} accessibilityLabel="Drag to adjust">
        <View style={[styles.tab, active && styles.tabActive]} />
        {active && (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{formatClock(value)}</Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: font.display, fontSize: 38, lineHeight: 42, color: ink.full },
  date: { flex: 1, textAlign: 'center', fontFamily: font.displayItalic, fontSize: 27, color: ink.full },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 14 },
  summaryText: { flex: 1, fontFamily: font.textItalic, fontSize: 15, lineHeight: 20, color: ink.soft },
  summaryFigure: { fontFamily: font.textMedium, fontStyle: 'normal', color: ink.full },
  summaryLinks: { flexDirection: 'row', gap: 14 },
  smallLink: { fontSize: 18 },

  timeline: { marginTop: 8, marginLeft: -4 },
  hour: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: 12, marginTop: -6 },
  hourLabel: { width: GUTTER, fontFamily: font.sans, fontSize: 10.5, color: ink.faint, fontVariant: ['tabular-nums'] },
  hourRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: ink.rule },

  block: { position: 'absolute', overflow: 'hidden', backgroundColor: paper.sheet },
  tint: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.27 },
  lifted: { zIndex: 2, overflow: 'visible', boxShadow: '0 8px 18px rgba(28,26,23,0.22)' },
  inkBar: { position: 'absolute', left: 1.5, top: 1, bottom: -1, width: 5, mixBlendMode: 'multiply' },
  topRule: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, backgroundColor: ink.full },
  ruleClipped: { height: 0 },
  runningEdge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: ink.red },
  blockInner: { paddingLeft: 14, paddingRight: 8, paddingTop: 4 },
  blockInnerTight: { paddingLeft: 14, paddingRight: 8, flex: 1, alignItems: 'center' },
  blockRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  blockName: { flexShrink: 1, fontFamily: font.display, fontSize: 21, lineHeight: 25, color: ink.full },
  blockFigure: { fontFamily: font.sansBold, fontSize: 11.5, color: ink.full, fontVariant: ['tabular-nums'] },
  blockTimes: { fontFamily: font.sans, fontSize: 10.5, letterSpacing: 0.3, color: ink.soft, fontVariant: ['tabular-nums'] },
  blockNote: { fontFamily: font.textItalic, fontSize: 12.5, letterSpacing: 0, color: ink.full },
  blockTiny: { paddingLeft: 14, marginTop: 1, fontFamily: font.sansBold, fontSize: 9.5, lineHeight: 12, color: ink.full },

  gap: { position: 'absolute', right: 0, justifyContent: 'center' },
  gapRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  gapText: { fontFamily: font.textItalic, fontSize: 14, color: ink.soft, fontVariant: ['tabular-nums'] },
  gapAsk: { color: ink.full, textDecorationLine: 'underline' },

  now: { position: 'absolute', left: 0, right: -margin, flexDirection: 'row', alignItems: 'center', height: 14, marginTop: -7, zIndex: 3 },
  nowLabel: {
    width: GUTTER - 4,
    marginRight: 4,
    fontFamily: font.sansBold,
    fontSize: 10.5,
    color: paper.sheet,
    backgroundColor: ink.red,
    textAlign: 'center',
    overflow: 'hidden',
    fontVariant: ['tabular-nums'],
  },
  nowRule: { flex: 1, height: 1.5, backgroundColor: ink.red },
  /** The rest of today, not yet printed: the hour rules show through faintly. */
  future: { position: 'absolute', left: -4, right: -margin, bottom: 0, backgroundColor: paper.sheet, opacity: 0.6 },

  handle: { position: 'absolute', width: HANDLE_HIT, height: 30, alignItems: 'center', justifyContent: 'center', zIndex: 4 },
  tab: { width: 22, height: 5, borderRadius: 2.5, backgroundColor: ink.full },
  tabActive: { width: 32, height: 7, borderRadius: 3.5, backgroundColor: ink.red },
  tag: {
    position: 'absolute',
    top: -24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: ink.full,
  },
  tagText: { fontFamily: font.sansBold, fontSize: 12, color: paper.sheet, fontVariant: ['tabular-nums'] },
  foot: { marginTop: 16, fontFamily: font.textItalic, fontSize: 14, color: ink.faint, textAlign: 'center' },
});

