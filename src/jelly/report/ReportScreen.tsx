// Week (and Day): where the time went. A native segmented control switches the range;
// the header steps through weeks or days. A few sentences about the week from the
// on-device model, bubbles sized by time, candy jars for weekly targets, the expandable
// tree of totals with copy buttons, and bead strings showing how fragmented each day was.

import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  addDays,
  type ContextId,
  type DayReport,
  formatDuration,
  startOfDay,
  startOfWeek,
  type TargetLine,
  totalsText,
  type Totals,
  useDayReport,
  useEntries,
  useNow,
  useTree,
  useWeekReport,
} from '@/core';
import { shellText } from '@/i18n/shell';
import { weekText } from '@/i18n/week';

import { buzz } from '../feedback';
import { HeaderTitle } from '../HeaderTitle';
import { tabular, text, useTheme } from '../theme';
import { dayTitles, weekTitles } from '../titles';
import { SectionTitle } from '../ui';
import { BeadString, WeekBeads } from './Beads';
import { Bubbles } from './Bubbles';
import { Jars } from './Jars';
import { TotalsTree } from './TotalsTree';
import { WeekSummary } from './WeekSummary';

type Mode = 'day' | 'week';
const modes: Mode[] = ['day', 'week'];

export function ReportScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'day' ? 'day' : 'week');
  const now = useNow(60_000);
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [week, setWeek] = useState(() => startOfWeek(Date.now()));

  const step = (dir: 1 | -1) => {
    buzz.tick();
    if (mode === 'day') setDay(addDays(day, dir));
    else setWeek(addDays(week, 7 * dir));
  };
  const current = mode === 'day' ? day === startOfDay(now) : week === startOfWeek(now);
  const jump = () => (mode === 'day' ? setDay(startOfDay(now)) : setWeek(startOfWeek(now)));
  const { title, subtitle } = mode === 'day' ? dayTitles(day, now) : weekTitles(week, now);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: t.c.bg }} contentContainerStyle={styles.content}>
      <Stack.Title asChild>
        <HeaderTitle title={title} subtitle={subtitle} onPress={current ? undefined : jump} />
      </Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="chevron.left" accessibilityLabel={shellText.header.previous(mode)} onPress={() => step(-1)} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="chevron.right" accessibilityLabel={shellText.header.next(mode)} onPress={() => step(1)} />
      </Stack.Toolbar>

      <View style={styles.segment}>
        <SegmentedControl
          values={modes.map((m) => weekText.ranges[m])}
          selectedIndex={modes.indexOf(mode)}
          onChange={(e) => {
            buzz.tick();
            setMode(modes[e.nativeEvent.selectedSegmentIndex] ?? 'week');
          }}
        />
      </View>
      {mode === 'day' ? <DayBody day={day} now={now} /> : <WeekBody week={week} now={now} />}
    </ScrollView>
  );
}

function WeekBody({ week, now }: { week: number; now: number }) {
  const t = useTheme();
  const report = useWeekReport(week);
  const { width } = useWindowDimensions();
  const targets = new Map(report.targets.map((line) => [line.context.id, line]));
  return (
    <>
      <Overview
        totals={report.totals}
        label={weekText.trackedWeek}
        range={{ start: report.start, end: report.end }}
        targets={targets}
        now={now}
        summary={<WeekSummary weekStart={week} />}>
        {report.targets.length > 0 && (
          <>
            <SectionTitle style={styles.section}>{weekText.jars}</SectionTitle>
            <Jars lines={report.targets} weekStart={report.start} />
          </>
        )}
      </Overview>
      {report.totals.total > 0 && (
        <>
          <SectionTitle style={styles.section}>{weekText.beadsPerDay}</SectionTitle>
          <View style={[styles.card, { backgroundColor: t.c.card }]}>
            <WeekBeads days={report.days} width={width - 64} now={now} />
            <Text style={[text.caption, styles.legend, { color: t.c.muted }]}>{weekText.beadsLegend}</Text>
          </View>
        </>
      )}
    </>
  );
}

function DayBody({ day, now }: { day: number; now: number }) {
  const report = useDayReport(day);
  const { width } = useWindowDimensions();
  return (
    <>
      <Overview totals={report.totals} label={weekText.trackedDay} range={{ start: report.start, end: report.end }} targets={new Map()} now={now} />
      {report.totals.total > 0 && (
        <>
          <SectionTitle style={styles.section}>{weekText.beads}</SectionTitle>
          <DayBeads report={report} width={width - 64} />
        </>
      )}
    </>
  );
}

function DayBeads({ report, width }: { report: DayReport; width: number }) {
  const t = useTheme();
  const { blocks, median } = report.fragmentation;
  return (
    <View style={[styles.card, { backgroundColor: t.c.card }]}>
      {blocks ? <BeadString day={report} width={width} /> : <Text style={[text.footnote, { color: t.c.muted }]}>{weekText.noBlocks}</Text>}
      <Text style={[text.callout, tabular, styles.fragment, { color: t.c.ink }]}>
        {weekText.blocks(blocks, formatDuration(median))}
      </Text>
    </View>
  );
}

/**
 * Big total, the `summary` in words, the bubbles, then `children` (the jars), then the
 * totals tree for a range.
 */
function Overview({
  totals,
  label,
  range,
  targets,
  now,
  summary,
  children,
}: {
  totals: Totals;
  label: string;
  range: { start: number; end: number };
  targets: ReadonlyMap<ContextId, TargetLine>;
  now: number;
  summary?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const entries = useEntries();
  const tree = useTree();
  const [expanded, setExpanded] = useState<ReadonlySet<ContextId>>(() => new Set());
  const toggle = (id: ContextId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (totals.total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🫙</Text>
        <Text style={[text.title3, styles.emptyTitle, { color: t.c.ink }]}>{weekText.emptyTitle}</Text>
        <Text style={[text.subhead, styles.emptyText, { color: t.c.muted }]}>{weekText.emptyText}</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.totalRow}>
        <Text style={[styles.total, tabular, { color: t.c.ink }]}>{formatDuration(totals.total)}</Text>
        <Text style={[text.footnote, { color: t.c.muted }]}>{label}</Text>
      </View>
      {summary}
      <View style={styles.bubbles}>
        <Bubbles nodes={totals.roots} width={width - 32} height={Math.min(250, 90 + totals.roots.length * 26)} onPick={(id) => toggle(id)} />
      </View>
      {children}
      <SectionTitle style={styles.section}>{weekText.totals}</SectionTitle>
      <TotalsTree
        roots={totals.roots}
        expanded={expanded}
        onToggle={toggle}
        targets={targets}
        textFor={(id) => totalsText(entries, tree, id, range, now)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  segment: { paddingHorizontal: 16, paddingTop: 8 },
  totalRow: { alignItems: 'center', marginTop: 14 },
  total: { fontFamily: 'ui-rounded', fontWeight: '800', fontSize: 52, letterSpacing: -1 },
  bubbles: { alignItems: 'center', marginTop: 12, paddingHorizontal: 16 },
  section: { marginHorizontal: 20, marginTop: 28 },
  card: { borderRadius: 24, padding: 16, marginHorizontal: 16 },
  legend: { marginTop: 12 },
  fragment: { marginTop: 10 },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 54 },
  emptyTitle: { marginTop: 8 },
  emptyText: { textAlign: 'center', marginTop: 4 },
});
