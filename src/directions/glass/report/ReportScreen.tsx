import SegmentedControl from '@expo/ui/community/segmented-control';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDays,
  type DayReport,
  formatDayMonth,
  formatDuration,
  formatRelativeDay,
  formatSignedDuration,
  formatWeekday,
  formatWeekRange,
  startOfDay,
  startOfWeek,
  type TargetLine,
  type Totals,
  useDayReport,
  useNow,
  useWeekReport,
} from '@/core';

import { Ambient } from '../Ambient';
import { Glass, GlassButton } from '../Glass';
import { Glyph } from '../Glyph';
import { numeric, useTheme } from '../theme';
import { CopyTotalsButton, TotalsTree } from './TotalsTree';

type Mode = 'day' | 'week';

/**
 * The Report tab: Day and Week, each an expandable tree of totals. Week adds target
 * lines and a per-day fragmentation chart; Day shows the day's blocks and median.
 */
export function ReportScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'day' ? 'day' : 'week');
  const [anchor, setAnchor] = useState(() => startOfDay(Date.now()));
  const [copied, setCopied] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const now = useNow(60_000);
  const today = startOfDay(now);
  const start = mode === 'day' ? anchor : startOfWeek(anchor);
  const step = mode === 'day' ? 1 : 7;
  const atLatest = mode === 'day' ? anchor >= today : startOfWeek(anchor) >= startOfWeek(today);

  const onCopied = (name: string) => {
    setCopied(name);
    setTimeout(() => setCopied((current) => (current === name ? null : current)), 2200);
  };

  const period =
    mode === 'day'
      ? formatRelativeDay(anchor, now)
      : startOfWeek(anchor) === startOfWeek(today)
        ? 'This week'
        : startOfWeek(anchor) === addDays(startOfWeek(today), -7)
          ? 'Last week'
          : `Week of ${formatDayMonth(startOfWeek(anchor))}`;

  return (
    <View style={styles.screen}>
      <Ambient still />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: theme.secondary }]}>
            {(mode === 'day' ? `${formatWeekday(anchor)} ${formatDayMonth(anchor)}` : formatWeekRange(start)).toUpperCase()}
          </Text>
          <Text style={[styles.title, { color: theme.label }]}>Report</Text>
        </View>
        <SegmentedControl
          values={['Day', 'Week']}
          selectedIndex={mode === 'day' ? 0 : 1}
          onChange={(e) => {
            Haptics.selectionAsync();
            setMode(e.nativeEvent.selectedSegmentIndex === 0 ? 'day' : 'week');
          }}
          style={styles.segments}
        />
        <View style={styles.period}>
          <GlassButton symbol="chevron.left" label="Earlier" size={36} onPress={() => setAnchor(addDays(anchor, -step))} />
          <Text style={[styles.periodText, { color: theme.label }]}>{period}</Text>
          <GlassButton
            symbol="chevron.right"
            label="Later"
            size={36}
            onPress={() => !atLatest && setAnchor(Math.min(addDays(anchor, step), today))}
            symbolColor={atLatest ? theme.tertiary : undefined}
          />
        </View>
        {mode === 'day' ? <DayView day={anchor} onCopied={onCopied} /> : <WeekView weekStart={start} onCopied={onCopied} />}
      </ScrollView>
      {copied ? (
        <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={[styles.copiedWrap, { bottom: insets.bottom + 62 }]} pointerEvents="none">
          <View style={[styles.copied, { backgroundColor: theme.label }]}>
            <Text style={[styles.copiedText, { color: theme.dark ? '#000000' : '#FFFFFF' }]}>Copied totals for {copied}</Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function DayView({ day, onCopied }: { day: number; onCopied: (name: string) => void }) {
  const report = useDayReport(day);
  const theme = useTheme();
  const { blocks, median } = report.fragmentation;
  return (
    <>
      <Summary totals={report.totals} caption={`${blocks} ${blocks === 1 ? 'block' : 'blocks'} · median ${formatDuration(median)}`} />
      <SectionTitle right={<CopyTotalsButton totals={report.totals} range={{ start: report.start, end: report.end }} onCopied={onCopied} />}>
        Where it went
      </SectionTitle>
      <TotalsTree totals={report.totals} range={{ start: report.start, end: report.end }} onCopied={onCopied} />
      <Text style={[styles.hint, { color: theme.secondary }]}>Tap a row to see what it contains.</Text>
    </>
  );
}

function WeekView({ weekStart, onCopied }: { weekStart: number; onCopied: (name: string) => void }) {
  const report = useWeekReport(weekStart);
  const theme = useTheme();
  const trackedDays = report.days.filter((d) => d.totals.total > 0).length;
  return (
    <>
      <Summary
        totals={report.totals}
        caption={trackedDays ? `${formatDuration(report.totals.total / trackedDays)} per tracked day` : 'Nothing tracked yet'}
      />
      {report.targets.length ? (
        <>
          <SectionTitle>Targets</SectionTitle>
          <Glass style={styles.card}>
            {report.targets.map((line, i) => (
              <Target key={line.context.id} line={line} first={i === 0} />
            ))}
          </Glass>
        </>
      ) : null}
      <SectionTitle right={<CopyTotalsButton totals={report.totals} range={{ start: report.start, end: report.end }} onCopied={onCopied} />}>
        Where it went
      </SectionTitle>
      <TotalsTree totals={report.totals} range={{ start: report.start, end: report.end }} onCopied={onCopied} />
      <SectionTitle>Fragmentation</SectionTitle>
      <Fragmentation days={report.days} />
      <Text style={[styles.hint, { color: theme.secondary }]}>Bars count blocks per day; below each, the median block length.</Text>
    </>
  );
}

/** The period's total, big and rounded, over a bar split by top-level context. */
function Summary({ totals, caption }: { totals: Totals; caption: string }) {
  const theme = useTheme();
  return (
    <Glass style={[styles.card, styles.summary]}>
      <Text style={[numeric, styles.big, { color: theme.label }]}>{formatDuration(totals.total)}</Text>
      <Text style={[styles.caption, { color: theme.secondary }]}>{caption}</Text>
      {totals.total > 0 ? (
        <>
          <View style={[styles.mix, { backgroundColor: theme.fill }]}>
            {totals.roots.map((node) => (
              <View key={node.context.id} style={{ flex: node.total, backgroundColor: theme.hue(node.context.hue).solid }} />
            ))}
          </View>
          <View style={styles.legend}>
            {totals.roots.map((node) => (
              <View key={node.context.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.hue(node.context.hue).solid }]} />
                <Text style={[styles.legendText, { color: theme.secondary }]} numberOfLines={1}>
                  {node.context.name} <Text style={numeric}>{Math.round((node.total / totals.total) * 100)}%</Text>
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Glass>
  );
}

/** "Job 36:40 / 40:00 (−3:20)" as a row with a progress bar. */
function Target({ line, first }: { line: TargetLine; first: boolean }) {
  const theme = useTheme();
  const hue = theme.hue(line.context.hue);
  const progress = Math.min(1, line.actual / line.target);
  const over = line.diff >= 0;
  return (
    <View
      accessibilityLabel={`${line.context.name} ${formatDuration(line.actual)} of ${formatDuration(line.target)}, ${formatSignedDuration(line.diff)}`}
      style={[styles.target, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
      <View style={styles.targetLine}>
        <Glyph context={line.context} size={18} />
        <Text style={[styles.targetName, { color: theme.label }]} numberOfLines={1}>
          {line.context.name}
        </Text>
        <Text style={[numeric, styles.targetNumbers, { color: theme.label }]}>
          {formatDuration(line.actual)}
          <Text style={{ color: theme.secondary }}> / {formatDuration(line.target)}</Text>
        </Text>
      </View>
      <View style={styles.targetBarRow}>
        <View style={[styles.targetTrack, { backgroundColor: theme.fill }]}>
          <View style={[styles.targetFill, { width: `${progress * 100}%`, backgroundColor: hue.solid }]} />
        </View>
        <Text style={[numeric, styles.diff, { color: over ? theme.hue('green').ink : theme.secondary }]}>{formatSignedDuration(line.diff)}</Text>
      </View>
    </View>
  );
}

/** Blocks per day as bars, with each day's median block length underneath. */
function Fragmentation({ days }: { days: DayReport[] }) {
  const theme = useTheme();
  const today = startOfDay(Date.now());
  const most = Math.max(1, ...days.map((d) => d.fragmentation.blocks));
  return (
    <Glass style={[styles.card, styles.chart]}>
      {days.map((d) => {
        const { blocks, median } = d.fragmentation;
        const main = d.totals.roots[0]?.context.hue;
        return (
          <View key={d.start} style={styles.chartColumn} accessibilityLabel={`${formatWeekday(d.start)}: ${blocks} blocks, median ${formatDuration(median)}`}>
            <Text style={[numeric, styles.chartCount, { color: blocks ? theme.label : theme.tertiary }]}>{blocks || ''}</Text>
            <View style={styles.chartTrack}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${Math.max(blocks ? 6 : 0, (blocks / most) * 100)}%`,
                    backgroundColor: main ? theme.hue(main).solid : theme.fill,
                  },
                ]}
              />
            </View>
            <Text style={[styles.chartDay, { color: d.start === today ? theme.hue('red').solid : theme.secondary }]}>
              {formatWeekday(d.start).slice(0, 3)}
            </Text>
            <Text style={[numeric, styles.chartMedian, { color: theme.secondary }]}>{blocks ? formatDuration(median) : '–'}</Text>
          </View>
        );
      })}
    </Glass>
  );
}

function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.section, { color: theme.secondary }]}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 140 },
  header: { paddingHorizontal: 4, paddingTop: 8, marginBottom: 14 },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  segments: { height: 36 },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 14 },
  periodText: { fontSize: 17, fontWeight: '600' },
  card: { borderRadius: 26 },
  summary: { padding: 20, gap: 2 },
  big: { fontSize: 52, fontWeight: '700', letterSpacing: -1.2, lineHeight: 58 },
  caption: { fontSize: 15, fontWeight: '500' },
  mix: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', gap: 2, marginTop: 14 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, fontWeight: '500' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 10, minHeight: 36 },
  section: { fontSize: 15, fontWeight: '600', marginLeft: 6 },
  target: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  targetLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetName: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  targetNumbers: { fontSize: 17, fontWeight: '600' },
  targetBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  targetTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  targetFill: { height: 8, borderRadius: 4 },
  diff: { fontSize: 15, fontWeight: '600', minWidth: 56, textAlign: 'right' },
  chart: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 14, gap: 4 },
  chartColumn: { flex: 1, alignItems: 'center', gap: 5 },
  chartCount: { fontSize: 13, fontWeight: '700', height: 16 },
  chartTrack: { height: 96, width: 22, justifyContent: 'flex-end' },
  chartBar: { width: 22, borderRadius: 7, borderCurve: 'continuous' },
  chartDay: { fontSize: 12, fontWeight: '600' },
  chartMedian: { fontSize: 11, fontWeight: '500' },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 10, marginHorizontal: 6 },
  copiedWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  copied: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  copiedText: { fontSize: 15, fontWeight: '600' },
});
