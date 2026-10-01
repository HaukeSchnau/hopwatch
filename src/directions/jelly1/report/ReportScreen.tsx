// Week (and Day): where the time went. Bubbles sized by time, candy jars for weekly
// targets, the expandable tree of totals with copy buttons, and bead strings showing
// how fragmented each day was.

import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

import { buzz } from '../feedback';
import { candy, colors, fonts, TAB_BAR_HEIGHT } from '../theme';
import { dayTitles, weekTitles } from '../titles';
import { EdgeFade, RoundButton, SectionTitle, Squishy } from '../ui';
import { BeadString, WeekBeads } from './Beads';
import { Bubbles } from './Bubbles';
import { Jars } from './Jars';
import { TotalsTree } from './TotalsTree';

type Mode = 'day' | 'week';

export function ReportScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(params.mode === 'day' ? 'day' : 'week');
  const now = useNow(60_000);
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [week, setWeek] = useState(() => startOfWeek(Date.now()));

  const step = (dir: 1 | -1) => (mode === 'day' ? setDay(addDays(day, dir)) : setWeek(addDays(week, 7 * dir)));
  const { title, subtitle } = mode === 'day' ? dayTitles(day, now) : weekTitles(week, now);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Segmented value={mode} onChange={setMode} />
        <View style={styles.nav}>
          <RoundButton icon="chevron.left" accessibilityLabel={`Previous ${mode}`} onPress={() => step(-1)} />
          <Squishy
            outerStyle={{ flex: 1 }}
            style={styles.titleWrap}
            onPress={() => (mode === 'day' ? setDay(startOfDay(now)) : setWeek(startOfWeek(now)))}
            accessibilityRole="button"
            accessibilityLabel={`Jump to this ${mode}`}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Squishy>
          <RoundButton icon="chevron.right" accessibilityLabel={`Next ${mode}`} onPress={() => step(1)} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }} showsVerticalScrollIndicator={false}>
          {mode === 'day' ? <DayBody day={day} now={now} /> : <WeekBody week={week} now={now} />}
        </ScrollView>
        <EdgeFade />
      </View>
    </View>
  );
}

function WeekBody({ week, now }: { week: number; now: number }) {
  const report = useWeekReport(week);
  const { width } = useWindowDimensions();
  const targets = new Map(report.targets.map((t) => [t.context.id, t]));
  return (
    <>
      <Overview totals={report.totals} label="tracked this week" range={{ start: report.start, end: report.end }} targets={targets} now={now}>
        {report.targets.length > 0 && (
          <>
            <SectionTitle style={styles.section}>Target jars</SectionTitle>
            <Jars lines={report.targets} weekStart={report.start} />
          </>
        )}
      </Overview>
      <SectionTitle style={styles.section}>Beads per day</SectionTitle>
      <View style={styles.card}>
        <WeekBeads days={report.days} width={width - 64} now={now} />
        <Text style={styles.legend}>One bead per block, sized by length · blocks · median</Text>
      </View>
    </>
  );
}

function DayBody({ day, now }: { day: number; now: number }) {
  const report = useDayReport(day);
  const { width } = useWindowDimensions();
  return (
    <>
      <Overview totals={report.totals} label="tracked this day" range={{ start: report.start, end: report.end }} targets={new Map()} now={now} />
      <SectionTitle style={styles.section}>Beads</SectionTitle>
      <DayBeads report={report} width={width - 64} />
    </>
  );
}

function DayBeads({ report, width }: { report: DayReport; width: number }) {
  const { blocks, median } = report.fragmentation;
  return (
    <View style={styles.card}>
      {blocks ? <BeadString day={report} width={width} /> : <Text style={styles.legend}>No blocks this day.</Text>}
      <Text style={styles.fragment}>
        {blocks} {blocks === 1 ? 'block' : 'blocks'} · median {formatDuration(median)}
      </Text>
    </View>
  );
}

/** Big total, the bubbles, then `children` (the jars), then the totals tree for a range. */
function Overview({
  totals,
  label,
  range,
  targets,
  now,
  children,
}: {
  totals: Totals;
  label: string;
  range: { start: number; end: number };
  targets: ReadonlyMap<ContextId, TargetLine>;
  now: number;
  children?: ReactNode;
}) {
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
        <Text style={styles.emptyTitle}>Nothing tracked here</Text>
        <Text style={styles.emptyText}>Time you track shows up as bubbles, jars and beads.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.totalRow}>
        <Text style={styles.total}>{formatDuration(totals.total)}</Text>
        <Text style={styles.totalLabel}>{label}</Text>
      </View>
      <View style={styles.bubbles}>
        <Bubbles nodes={totals.roots} width={width - 32} height={Math.min(250, 90 + totals.roots.length * 26)} onPick={(id) => toggle(id)} />
      </View>
      {children}
      <SectionTitle style={styles.section}>Totals</SectionTitle>
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

/** Day | Week toggle with a gummy thumb that slides and squishes. */
function Segmented({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const W = 200;
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(value === 'day' ? 0 : W / 2 - 4, { damping: 13, stiffness: 200 }) }],
  }));
  return (
    <View style={[styles.segment, { width: W }]}>
      <Animated.View style={[styles.thumb, { width: W / 2 - 4 }, thumb]} />
      {(['day', 'week'] as const).map((m) => (
        <Pressable
          key={m}
          style={styles.segmentItem}
          onPress={() => {
            if (m !== value) buzz.tick();
            onChange(m);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === m }}>
          <Text style={[styles.segmentText, value === m && { color: colors.white }]}>{m === 'day' ? 'Day' : 'Week'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 16, alignItems: 'center', gap: 10, paddingBottom: 6 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.textBold, fontSize: 14, color: colors.muted, marginTop: -3 },
  segment: { height: 40, borderRadius: 20, backgroundColor: colors.sunken, flexDirection: 'row', padding: 2, marginTop: 2 },
  thumb: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    borderRadius: 18,
    backgroundColor: candy.pink.fill,
    borderBottomWidth: 3,
    borderBottomColor: candy.pink.deep,
  },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 36 },
  segmentText: { fontFamily: fonts.display, fontSize: 16, color: colors.muted },
  totalRow: { alignItems: 'center', marginTop: 10 },
  total: { fontFamily: fonts.displayBold, fontSize: 52, color: colors.ink, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  totalLabel: { fontFamily: fonts.textBold, fontSize: 14, color: colors.muted, marginTop: -6 },
  bubbles: { alignItems: 'center', marginTop: 12, paddingHorizontal: 16 },
  section: { marginHorizontal: 22, marginTop: 26 },
  card: { backgroundColor: colors.card, borderRadius: 26, padding: 16, marginHorizontal: 16 },
  legend: { fontFamily: fonts.text, fontSize: 12, color: colors.muted, marginTop: 12 },
  fragment: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginTop: 10 },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 54 },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink, marginTop: 8 },
  emptyText: { fontFamily: fonts.text, fontSize: 15, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
