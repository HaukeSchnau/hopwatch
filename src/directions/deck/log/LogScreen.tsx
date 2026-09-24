import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import {
  actions,
  addDays,
  type EntryId,
  formatClock,
  formatDuration,
  type GapSegment,
  MINUTE,
  type Segment,
  startOfDay,
  useDayReport,
  useNow,
} from '@/core';

import { Body, Print } from '../Body';
import { useDevParam } from '../devParams';
import { detent, keyDown } from '../feedback';
import { Triangle } from '../Glyphs';
import { DeviceHeader } from '../Header';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { UndoStrip } from '../UndoStrip';
import { body, capColor, capDark, capNeutral, lcd, legendOn } from '../theme';
import { BlockLegend } from './BlockLegend';
import { HOUR_PX, PX_PER_MS } from './scale';
import { TrimBlock } from './TrimBlock';

const RULER = 46;
const TAPE_LEFT = 58;
const TAPE_WIDTH = 150;
const NOTE_LEFT = TAPE_LEFT + TAPE_WIDTH + 12;
const PAD = 14;

const dayTitle = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * LOG: one day as a vertical tape. Blocks in cap colors, gaps as hatched blank tape
 * that asks "what was this?", a playhead for now. Tap a block to open it, hold it to
 * trim its edges.
 */
export function LogScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ offset?: string }>();
  const now = useNow(30_000);
  const today = startOfDay(now);
  const [day, setDay] = useState(() => addDays(startOfDay(Date.now()), Number(params.offset ?? 0) || 0));
  const report = useDayReport(day);
  const [trimId, setTrimId] = useState<EntryId | null>(null);
  // Development: `?trim=N` trims the Nth block, `?open=N` opens it, `?fill=N` fills gap N.
  const trimParam = useDevParam('trim');
  const openParam = useDevParam('open');
  const fillParam = useDevParam('fill');
  const devApplied = useRef(false);
  useEffect(() => {
    if (devApplied.current || report.segments.length === 0) return;
    const segment = report.segments[Number(trimParam ?? openParam) - 1];
    const gap = report.gaps[Number(fillParam) - 1];
    if (trimParam && segment) setTrimId(segment.entry.id);
    else if (openParam && segment) router.push({ pathname: '/deck/entry/[id]', params: { id: segment.entry.id } });
    else if (fillParam && gap) {
      router.push({ pathname: '/deck/fill', params: { start: String(gap.start), end: String(gap.end), at: String(gap.start) } });
    } else return;
    devApplied.current = true;
  }, [trimParam, openParam, fillParam, report.segments, report.gaps]);
  const [preview, setPreview] = useState<{ start: number; end: number } | null>(null);
  const [viewport, setViewport] = useState(0);

  const isToday = day === today;
  const dayEnd = addDays(day, 1);
  const trimmed = trimId ? (report.segments.find((s) => s.entry.id === trimId) ?? null) : null;
  const trimming = trimmed !== null;
  const limit = Math.min(dayEnd, now);
  const y = (t: number) => (t - day) * PX_PER_MS;
  const height = (dayEnd - day) * PX_PER_MS;

  const go = (delta: number) => {
    setTrimId(null);
    setDay(addDays(day, delta));
  };

  // Open near the action: now on today, the first block on other days.
  const first = report.segments[0]?.start ?? day + 8 * 60 * MINUTE;
  const initialY = viewport === 0 ? 0 : Math.max(0, (isToday ? y(now) - viewport * 0.62 : y(first) - 40) + PAD);

  return (
    <Body>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <DeviceHeader mode="LOG" />
        <View style={styles.nav}>
          <Key color={capNeutral} height={56} width={52} onPress={() => go(-1)} capStyle={styles.center} accessibilityLabel="Previous day">
            <Triangle dir="left" size={9} color={body.ink} />
          </Key>
          <Lcd style={styles.dayLcd} contentStyle={styles.dayContent}>
            <View style={styles.dayRow}>
              <LcdText size={8} color={lcd.dim}>
                {isToday ? 'TODAY' : day === addDays(today, -1) ? 'YESTERDAY' : `${Math.round((today - day) / 86_400_000)} DAYS AGO`}
              </LcdText>
              <LcdText size={8} color={lcd.dim}>
                {report.fragmentation.blocks} {report.fragmentation.blocks === 1 ? 'BLOCK' : 'BLOCKS'} · MED {formatDuration(report.fragmentation.median)}
              </LcdText>
            </View>
            <View style={styles.dayRow}>
              <LcdText dot size={21} style={styles.dayTitle}>
                {dayTitle.format(day).toLocaleUpperCase('en-GB')}
              </LcdText>
              <LcdText dot size={21} color={lcd.hot} style={styles.dayTitle}>
                {formatDuration(report.totals.total)}
              </LcdText>
            </View>
          </Lcd>
          <Key
            color={capNeutral}
            height={56}
            width={52}
            disabled={isToday}
            onPress={() => go(1)}
            onLongPress={() => {
              setTrimId(null);
              setDay(today);
            }}
            capStyle={styles.center}
            accessibilityLabel="Next day">
            <Triangle dir="right" size={9} color={body.ink} />
          </Key>
        </View>

        <View style={styles.tapeFrame} onLayout={(e) => setViewport(e.nativeEvent.layout.height)}>
          {viewport > 0 ? (
            <ScrollView
              key={day}
              scrollEnabled={!trimming}
              contentOffset={{ x: 0, y: initialY }}
              contentContainerStyle={{ height: height + PAD * 2 + 60 }}
              showsVerticalScrollIndicator={false}>
              <View style={[styles.content, { height, marginTop: PAD }]}>
                <Ruler />
                <View style={[styles.channel, { height: height + 8 }]} />
                <View style={[styles.tape, { height: y(limit) }]} />
                <Gaps gaps={report.gaps} day={day} />
                {report.segments.map((s) => (
                  <Block
                    key={s.entry.id}
                    segment={s}
                    day={day}
                    dimmed={trimming && s.entry.id !== trimId}
                    onPress={() => router.push({ pathname: '/deck/entry/[id]', params: { id: s.entry.id } })}
                    onLongPress={() => {
                      keyDown(true);
                      setPreview(null);
                      setTrimId(s.entry.id);
                    }}
                  />
                ))}
                {isToday ? <Playhead top={y(now)} now={now} /> : null}
                {trimmed ? (
                  <>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setTrimId(null)} accessibilityLabel="Stop trimming" />
                    <View style={styles.trimLayer} pointerEvents="box-none">
                      <TrimBlock
                        key={trimmed.entry.id}
                        segment={trimmed}
                        dayStart={day}
                        limit={limit}
                        onSnap={(start, end) => {
                          detent();
                          setPreview({ start, end });
                        }}
                        onCommit={(edge, at) => {
                          actions.updateEntry(trimmed.entry.id, edge === 'start' ? { startUtc: at } : { endUtc: at });
                          setPreview(null);
                        }}
                      />
                    </View>
                  </>
                ) : null}
              </View>
            </ScrollView>
          ) : null}
          <View pointerEvents="none" style={styles.fadeTop} />
        </View>

        {trimmed ? (
          <TrimBar
            start={preview?.start ?? trimmed.start}
            end={preview?.end ?? trimmed.end}
            running={trimmed.running}
            onOpen={() => router.push({ pathname: '/deck/entry/[id]', params: { id: trimmed.entry.id } })}
            onDone={() => setTrimId(null)}
          />
        ) : null}
        <UndoStrip bottom={trimmed ? 84 : 12} />
      </View>
    </Body>
  );
}

/** Hour marks printed on the body next to the tape. */
function Ruler() {
  return (
    <View style={styles.ruler} pointerEvents="none">
      {Array.from({ length: 25 }, (_, h) => (
        <View key={h} style={[styles.hourMark, { top: h * HOUR_PX }]}>
          <Print size={8.5} weight={h % 6 === 0 ? 'bold' : 'medium'} color={h % 6 === 0 ? body.ink : body.ink2} style={styles.hourLabel}>
            {String(h).padStart(2, '0')}
          </Print>
          <View style={[styles.tick, { width: 10 }]} />
        </View>
      ))}
      {Array.from({ length: 24 * 4 }, (_, q) =>
        q % 4 === 0 ? null : <View key={`q${q}`} style={[styles.minorTick, { top: (q * HOUR_PX) / 4, width: q % 2 === 0 ? 6 : 4 }]} />,
      )}
    </View>
  );
}

function Gaps({ gaps, day }: { gaps: GapSegment[]; day: number }) {
  const y = (t: number) => (t - day) * PX_PER_MS;
  return (
    <>
      <Svg style={[styles.gapArt, { height: y(gaps.at(-1)?.end ?? day) + 1 }]} pointerEvents="none">
        <Defs>
          <Pattern id="hatch" patternUnits="userSpaceOnUse" width={8} height={8}>
            <Path d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" stroke="rgba(60,52,40,0.22)" strokeWidth={1.3} />
          </Pattern>
        </Defs>
        {gaps.map((g) => (
          <Rect key={g.start} x={0} y={y(g.start)} width={TAPE_WIDTH} height={Math.max(0, y(g.end) - y(g.start))} fill="url(#hatch)" />
        ))}
      </Svg>
      {gaps.map((g) => {
        const top = y(g.start);
        const h = y(g.end) - top;
        if (h < 6) return null;
        return (
          <Pressable
            key={g.start}
            style={[styles.gap, { top, height: h }]}
            accessibilityLabel={`Untracked ${formatClock(g.start)} to ${formatClock(g.end)}`}
            onPress={(e) => {
              detent();
              const at = g.start + e.nativeEvent.locationY / PX_PER_MS;
              router.push({ pathname: '/deck/fill', params: { start: String(g.start), end: String(g.end), at: String(Math.round(at)) } });
            }}>
            {h >= 30 ? (
              <View style={styles.plus}>
                <Print size={11} weight="bold" color={body.ink2} spacing={0}>
                  +
                </Print>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </>
  );
}

interface BlockProps {
  segment: Segment;
  day: number;
  dimmed: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function Block({ segment, day, dimmed, onPress, onLongPress }: BlockProps) {
  const top = (segment.start - day) * PX_PER_MS;
  const h = Math.max(3, (segment.end - segment.start) * PX_PER_MS);
  const color = capColor[segment.context.hue];
  const ink = legendOn(color);
  return (
    <>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={320}
        accessibilityLabel={`${segment.context.name} ${formatClock(segment.start)} to ${formatClock(segment.end)}`}
        style={[styles.block, { top, height: h, backgroundColor: color, opacity: dimmed ? 0.35 : 1 }]}>
        <BlockLegend context={segment.context} ink={ink} height={h} />
        {segment.running ? <View style={[styles.recEdge, { backgroundColor: ink }]} /> : null}
      </Pressable>
      {h >= 16 ? (
        <View style={[styles.note, { top: top + 1, opacity: dimmed ? 0.3 : 1 }]} pointerEvents="none">
          <Print size={8} weight="medium" color={body.ink2} spacing={0.4} numberOfLines={1}>
            {formatClock(segment.start)}–{segment.running ? 'NOW' : formatClock(segment.end)}
          </Print>
          {h >= 30 ? (
            <Print size={8} weight="bold" color={body.ink} spacing={0.4}>
              {formatDuration(segment.end - segment.start)}
              {segment.entry.note ? ' · NOTE' : ''}
            </Print>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

function Playhead({ top, now }: { top: number; now: number }) {
  return (
    <View style={[styles.playhead, { top: top - 7 }]} pointerEvents="none">
      <Triangle dir="right" size={8} color={body.accent} />
      <View style={styles.playLine} />
      <View style={styles.playTag}>
        <Print size={7.5} weight="bold" color="#FFFFFF" spacing={0.8}>
          NOW {formatClock(now)}
        </Print>
      </View>
    </View>
  );
}

interface TrimBarProps {
  start: number;
  end: number;
  running: boolean;
  onOpen: () => void;
  onDone: () => void;
}

/** While trimming: the live range on a display strip, plus OPEN and DONE keys. */
function TrimBar({ start, end, running, onOpen, onDone }: TrimBarProps) {
  return (
    <View style={styles.trimBar}>
      <Lcd style={styles.trimLcd} pixels={false} contentStyle={styles.trimContent}>
        <LcdText size={8} color={lcd.dim}>
          TRIM · DRAG THE GRIPS
        </LcdText>
        <LcdText size={12}>
          {formatClock(start)}–{running ? 'NOW' : formatClock(end)} · {formatDuration(end - start)}
        </LcdText>
      </Lcd>
      <Key color={capNeutral} height={50} width={64} onPress={onOpen} capStyle={styles.center}>
        <Print size={8.5} weight="bold" color={body.ink}>
          OPEN
        </Print>
      </Key>
      <Key color={capDark} height={50} width={64} onPress={onDone} capStyle={styles.center}>
        <Print size={8.5} weight="bold" color="#F4F1EA">
          DONE
        </Print>
      </Key>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, marginTop: 4 },
  dayLcd: { flex: 1, height: 64 },
  dayContent: { justifyContent: 'center', paddingHorizontal: 12, gap: 1 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayTitle: { lineHeight: 25, marginTop: 1 },
  tapeFrame: { flex: 1, marginTop: 12 },
  fadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  content: { marginHorizontal: 0 },
  ruler: { position: 'absolute', left: 0, width: RULER + 4, top: 0, bottom: 0 },
  hourMark: { position: 'absolute', left: 12, right: 0, flexDirection: 'row', alignItems: 'center', height: 12, marginTop: -6, gap: 5 },
  hourLabel: { width: 18 },
  tick: { height: 1.2, backgroundColor: body.ink2 },
  minorTick: { position: 'absolute', right: 0, height: 1, backgroundColor: body.ink3, opacity: 0.7 },
  channel: {
    position: 'absolute',
    left: TAPE_LEFT - 6,
    width: TAPE_WIDTH + 12,
    top: -4,
    borderRadius: 10,
    backgroundColor: 'rgba(40,34,26,0.14)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.12)',
  },
  tape: {
    position: 'absolute',
    left: TAPE_LEFT,
    width: TAPE_WIDTH,
    top: 0,
    backgroundColor: '#F1EEE7',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    shadowOffset: { width: 0, height: 1 },
  },
  gapArt: { position: 'absolute', left: TAPE_LEFT, width: TAPE_WIDTH, top: 0 },
  gap: { position: 'absolute', left: TAPE_LEFT, width: TAPE_WIDTH, alignItems: 'center', justifyContent: 'center' },
  plus: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1EEE7',
    borderWidth: 1,
    borderColor: 'rgba(60,52,40,0.35)',
  },
  block: {
    position: 'absolute',
    left: TAPE_LEFT,
    width: TAPE_WIDTH,
    borderRadius: 2,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.22)',
  },
  recEdge: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, opacity: 0.7 },
  note: { position: 'absolute', left: NOTE_LEFT, right: 14, gap: 2 },
  playhead: { position: 'absolute', left: 38, right: 0, height: 14, flexDirection: 'row', alignItems: 'center' },
  playLine: { flex: 1, height: 1.5, backgroundColor: body.accent },
  playTag: { backgroundColor: body.accent, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, marginRight: 14 },
  trimLayer: { position: 'absolute', left: TAPE_LEFT, width: TAPE_WIDTH, top: 0, bottom: 0 },
  trimBar: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  trimLcd: { flex: 1, height: 54 },
  trimContent: { justifyContent: 'center', paddingHorizontal: 12, gap: 4 },
});
