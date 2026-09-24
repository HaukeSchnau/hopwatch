import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDays,
  type ContextId,
  type DayReport,
  dayRange,
  formatDuration,
  formatLongDay,
  formatSignedDuration,
  formatWeekRange,
  HOUR,
  startOfDay,
  type TargetLine,
  type Totals,
  totalsText,
  useDayReport,
  useEntries,
  useNow,
  useTree,
  useWeekReport,
  weekRange,
} from '@/core';

import { Body, Print } from '../Body';
import { success } from '../feedback';
import { Triangle } from '../Glyphs';
import { DeviceHeader } from '../Header';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Led } from '../Led';
import { body, capDark, capNeutral, lcd } from '../theme';
import { Meter } from './Meter';
import { TotalsTree } from './TotalsTree';

type Mode = 'day' | 'week';

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'narrow' });

/** ISO week number, for the week header. */
function isoWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

interface StatsState {
  cursor: ContextId | null;
  expanded: ReadonlySet<ContextId>;
  onRow: (id: ContextId) => void;
}

/**
 * STATS: the report on the display. DAY and WEEK keys, the totals tree with meters,
 * target VU meters in week mode, blocks and median per day, and COPY for the row
 * under the cursor.
 */
export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; offset?: string }>();
  const now = useNow(60_000);
  const [mode, setMode] = useState<Mode>(params.mode === 'week' ? 'week' : 'day');
  const [anchor, setAnchor] = useState(() => addDays(startOfDay(Date.now()), Number(params.offset ?? 0) || 0));
  const [cursor, setCursor] = useState<ContextId | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<ContextId>>(new Set());

  const range = mode === 'day' ? dayRange(anchor) : weekRange(anchor);
  const isCurrent = now < range.end;
  const step = (dir: 1 | -1) => setAnchor(addDays(anchor, dir * (mode === 'day' ? 1 : 7)));

  const state: StatsState = {
    cursor,
    expanded,
    onRow: (id) => {
      setCursor(id);
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExpanded(next);
    },
  };

  return (
    <Body>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <DeviceHeader mode="STATS" />
        <View style={styles.controls}>
          <Key color={capNeutral} height={44} width={82} latched={mode === 'day'} onPress={() => setMode('day')} capStyle={styles.modeCap}>
            <Led on={mode === 'day'} size={6} />
            <Print size={9} weight="bold" color={body.ink}>
              DAY
            </Print>
          </Key>
          <Key color={capNeutral} height={44} width={82} latched={mode === 'week'} onPress={() => setMode('week')} capStyle={styles.modeCap}>
            <Led on={mode === 'week'} size={6} />
            <Print size={9} weight="bold" color={body.ink}>
              WEEK
            </Print>
          </Key>
          <View style={{ flex: 1 }} />
          <Key color={capNeutral} height={44} width={50} onPress={() => step(-1)} capStyle={styles.center} accessibilityLabel="Earlier">
            <Triangle dir="left" size={8} color={body.ink} />
          </Key>
          <Key
            color={capNeutral}
            height={44}
            width={50}
            disabled={isCurrent}
            onPress={() => step(1)}
            onLongPress={() => setAnchor(startOfDay(Date.now()))}
            capStyle={styles.center}
            accessibilityLabel="Later">
            <Triangle dir="right" size={8} color={body.ink} />
          </Key>
        </View>
        {mode === 'day' ? (
          <DayStats day={range.start} state={state} />
        ) : (
          <WeekStats
            weekStart={range.start}
            state={state}
            onDay={(day) => {
              setAnchor(day);
              setMode('day');
            }}
          />
        )}
      </View>
    </Body>
  );
}

function DayStats({ day, state }: { day: number; state: StatsState }) {
  const report = useDayReport(day);
  return (
    <Report
      totals={report.totals}
      range={{ start: report.start, end: report.end }}
      state={state}
      kicker={day === startOfDay(Date.now()) ? 'TODAY' : 'DAY'}
      title={formatLongDay(day).toLocaleUpperCase('en-GB')}>
      <Heading label="RHYTHM" />
      <View style={styles.dayRhythm}>
        <Figure label="BLOCKS" value={String(report.fragmentation.blocks)} />
        <Figure label="MEDIAN BLOCK" value={formatDuration(report.fragmentation.median)} />
        <Figure label="LONGEST" value={formatDuration(Math.max(0, ...report.segments.map((s) => s.end - s.start)))} />
      </View>
    </Report>
  );
}

function WeekStats({ weekStart, state, onDay }: { weekStart: number; state: StatsState; onDay: (day: number) => void }) {
  const report = useWeekReport(weekStart);
  return (
    <Report
      totals={report.totals}
      range={{ start: report.start, end: report.end }}
      state={state}
      kicker={`WEEK ${isoWeek(weekStart)}`}
      title={formatWeekRange(weekStart).toLocaleUpperCase('en-GB')}
      before={
        report.targets.length > 0 ? (
          <>
            <Heading label="TARGETS" />
            {report.targets.map((t) => (
              <TargetRow key={t.context.id} line={t} />
            ))}
          </>
        ) : null
      }>
      <Heading label="RHYTHM · BLOCKS AND MEDIAN PER DAY" />
      <WeekRhythm days={report.days} onDay={onDay} />
    </Report>
  );
}

interface ReportProps {
  totals: Totals;
  range: { start: number; end: number };
  state: StatsState;
  kicker: string;
  title: string;
  before?: ReactNode;
  children: ReactNode;
}

/** The report display plus the COPY key underneath. */
function Report({ totals, range, state, kicker, title, before, children }: ReportProps) {
  const entries = useEntries();
  const tree = useTree();
  const [copied, setCopied] = useState<string | null>(null);
  const cursorNode = (state.cursor && totals.byId.get(state.cursor)) || totals.roots[0] || null;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(null), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (!cursorNode) return;
    await Clipboard.setStringAsync(totalsText(entries, tree, cursorNode.context.id, range, Date.now()));
    success();
    setCopied(cursorNode.context.name);
  };

  return (
    <>
      <Lcd style={styles.lcd}>
        <ScrollView contentContainerStyle={styles.scroll} indicatorStyle="white">
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <LcdText size={8.5} color={copied ? lcd.hot : lcd.dim}>
                {copied ? `COPIED ${copied.toLocaleUpperCase('en-GB')} TO CLIPBOARD` : kicker}
              </LcdText>
              <LcdText dot size={20} style={styles.title} numberOfLines={1}>
                {title}
              </LcdText>
            </View>
            <LcdText dot size={34} color={lcd.hot} style={styles.total}>
              {formatDuration(totals.total)}
            </LcdText>
          </View>
          {before}
          <Heading label="WHERE IT WENT" />
          {totals.roots.length === 0 ? (
            <LcdText size={10} color={lcd.dim} style={styles.empty}>
              NOTHING TRACKED IN THIS RANGE
            </LcdText>
          ) : (
            <TotalsTree totals={totals} expanded={state.expanded} cursor={cursorNode?.context.id ?? null} onRow={state.onRow} />
          )}
          {children}
        </ScrollView>
      </Lcd>
      <View style={styles.copyRow}>
        <Key color={capDark} height={52} style={{ flex: 1 }} disabled={!cursorNode} onPress={copy} capStyle={styles.copyCap}>
          <Print size={9} weight="bold" color="#F4F1EA" spacing={1.4}>
            COPY
          </Print>
          <Print size={9} weight="bold" color="#F4F1EA" numberOfLines={1} style={{ flex: 1 }}>
            {cursorNode ? `${cursorNode.context.name} · ${formatDuration(cursorNode.total)}` : '—'}
          </Print>
        </Key>
      </View>
      <Print size={7.5} color={body.ink3} style={styles.hint}>
        TAP A ROW TO OPEN IT AND PUT THE CURSOR ON IT
      </Print>
    </>
  );
}

function Heading({ label }: { label: string }) {
  return (
    <View style={styles.heading}>
      <LcdText size={8} color={lcd.dim} glow={false}>
        {label}
      </LcdText>
      <View style={styles.headingRule} />
    </View>
  );
}

/** "JOB 36:40 / 40:00 (−3:20)" as a VU meter. */
function TargetRow({ line }: { line: TargetLine }) {
  const ahead = line.diff >= 0;
  return (
    <View style={styles.target}>
      <View style={styles.targetTop}>
        <LcdText size={10.5} numberOfLines={1} style={{ flex: 1 }}>
          {line.context.name.toLocaleUpperCase('en-GB')}
        </LcdText>
        <LcdText size={10.5}>
          {formatDuration(line.actual)} / {formatDuration(line.target)}
        </LcdText>
      </View>
      <View style={styles.targetBottom}>
        <Meter value={line.target > 0 ? line.actual / line.target : 0} segments={24} height={11} overColor="#FF5A48" />
        <LcdText size={10.5} color={ahead ? lcd.hot : lcd.dim} style={styles.diff}>
          {formatSignedDuration(line.diff)}
        </LcdText>
      </View>
    </View>
  );
}

function WeekRhythm({ days, onDay }: { days: DayReport[]; onDay: (day: number) => void }) {
  const max = Math.max(8 * HOUR, ...days.map((d) => d.totals.total));
  return (
    <View style={styles.week}>
      {days.map((d) => (
        <Pressable key={d.start} style={styles.dayCol} onPress={() => onDay(d.start)} accessibilityLabel={formatLongDay(d.start)}>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${(d.totals.total / max) * 100}%` }]} />
          </View>
          <LcdText size={9}>{weekday.format(d.start)}</LcdText>
          <LcdText size={8} color={lcd.dim} glow={false}>
            {d.totals.total ? formatDuration(d.totals.total) : '–'}
          </LcdText>
          <LcdText size={8} color={lcd.dim} glow={false}>
            {d.fragmentation.blocks ? `${d.fragmentation.blocks}×` : ''}
          </LcdText>
          <LcdText size={8} color={lcd.dim} glow={false}>
            {d.fragmentation.blocks ? formatDuration(d.fragmentation.median) : ''}
          </LcdText>
        </Pressable>
      ))}
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.figure}>
      <LcdText dot size={26} color={lcd.hot} style={styles.figureValue}>
        {value}
      </LcdText>
      <LcdText size={7.5} color={lcd.dim} glow={false}>
        {label}
      </LcdText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  modeCap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginTop: 4, marginBottom: 12 },
  lcd: { flex: 1, marginHorizontal: 12 },
  scroll: { paddingBottom: 18 },
  head: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6, gap: 12 },
  title: { lineHeight: 26, marginTop: 2 },
  total: { lineHeight: 38 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, marginTop: 16, marginBottom: 6 },
  headingRule: { flex: 1, height: 1, backgroundColor: lcd.line },
  empty: { paddingHorizontal: 14, paddingVertical: 10 },
  target: { paddingHorizontal: 14, paddingVertical: 7, gap: 7 },
  targetTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  targetBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diff: { width: 60, textAlign: 'right' },
  week: { flexDirection: 'row', paddingHorizontal: 10, gap: 4 },
  dayCol: { flex: 1, alignItems: 'center', gap: 3 },
  barTrack: { width: 14, height: 70, justifyContent: 'flex-end', backgroundColor: lcd.ghost, marginBottom: 4 },
  bar: { width: 14, backgroundColor: lcd.ink, shadowColor: lcd.glow, shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  dayRhythm: { flexDirection: 'row', paddingHorizontal: 14, gap: 12 },
  figure: { flex: 1, gap: 2 },
  figureValue: { lineHeight: 30 },
  copyRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14 },
  copyCap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  hint: { textAlign: 'center', marginTop: 8, marginBottom: 12 },
});
