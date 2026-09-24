import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDays,
  type DayReport,
  formatDuration,
  formatRelativeDay,
  formatSignedDuration,
  formatTargetLine,
  formatWeekRange,
  startOfDay,
  startOfWeek,
  type TargetLine,
  useDayReport,
  useNow,
  useWeekReport,
} from '@/core';

import { dayParam, parseDayParam } from '../dates';
import { Dial } from '../Dial';
import { dialFrame } from '../geometry';
import { useTabBarClearance } from '../TabBar';
import { alpha, font, neon, sky } from '../theme';
import { IconButton, Label } from '../ui';
import { Gauge } from './Gauge';
import { TotalsTree } from './TotalsTree';

type Mode = 'day' | 'week';

/**
 * Day and week report: totals rolled up the tree, weekly targets as gauges, and each
 * day's block count and median as small multiples. `?mode=day|week&date=YYYY-MM-DD`.
 */
export function ReportScreen() {
  const params = useLocalSearchParams<{ mode?: string; date?: string }>();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const now = useNow(30_000);
  const today = startOfDay(now);
  const fromParams = { mode: params.mode === 'day' ? 'day' : 'week', day: parseDayParam(params.date) ?? today } as const;
  const [picked, setPicked] = useState<{ key: string; mode: Mode; day: number } | null>(null);
  const key = `${params.mode}|${params.date}`;
  const { mode, day } = picked?.key === key ? picked : fromParams;
  const choose = (next: { mode?: Mode; day?: number }) => {
    Haptics.selectionAsync();
    setPicked({ key, mode: next.mode ?? mode, day: next.day ?? day });
  };

  const step = mode === 'week' ? 7 : 1;
  const anchor = mode === 'week' ? startOfWeek(day) : day;
  const canGoForward = addDays(anchor, step) <= today;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: clearance }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Report</Text>
        <ModeSwitch mode={mode} onChange={(m) => choose({ mode: m })} />
      </View>
      <View style={styles.nav}>
        <IconButton name="chevron.left" color={sky.text} accessibilityLabel="Earlier" onPress={() => choose({ day: addDays(anchor, -step) })} />
        <Text style={styles.range}>{mode === 'week' ? formatWeekRange(anchor) : formatRelativeDay(anchor, now)}</Text>
        <IconButton
          name="chevron.right"
          color={canGoForward ? sky.text : sky.faint}
          accessibilityLabel="Later"
          onPress={() => canGoForward && choose({ day: addDays(anchor, step) })}
        />
      </View>
      <Animated.View key={`${mode}${anchor}`} entering={FadeIn.duration(220)}>
        {mode === 'week' ? (
          <WeekReportView weekStart={anchor} now={now} onDay={(d) => choose({ mode: 'day', day: d })} />
        ) : (
          <DayReportView day={anchor} now={now} />
        )}
      </Animated.View>
    </ScrollView>
  );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <View style={styles.switch}>
      {(['day', 'week'] as const).map((m) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          accessibilityRole="tab"
          accessibilityState={{ selected: m === mode }}
          style={[styles.switchItem, m === mode && styles.switchActive]}>
          <Text style={[styles.switchText, m === mode && { color: sky.bg }]}>{m === 'day' ? 'Day' : 'Week'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function WeekReportView({ weekStart, now, onDay }: { weekStart: number; now: number; onDay: (day: number) => void }) {
  const report = useWeekReport(weekStart);
  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.big}>{formatDuration(report.totals.total)}</Text>
        <Label>tracked this week</Label>
      </View>
      <WeekStrip days={report.days} now={now} onDay={onDay} />
      {report.targets.length > 0 && (
        <View style={styles.section}>
          <Label style={styles.sectionLabel}>Targets</Label>
          {report.targets.map((line) => (
            <TargetRow key={line.context.id} line={line} />
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Label style={styles.sectionLabel}>Where the week went</Label>
        <TotalsTree totals={report.totals} range={{ start: report.start, end: report.end }} now={now} />
      </View>
    </View>
  );
}

/** Seven small rings, Monday first, each with its total, blocks and median. */
function WeekStrip({ days, now, onDay }: { days: DayReport[]; now: number; onDay: (day: number) => void }) {
  const { width } = useWindowDimensions();
  const column = (width - 24) / 7;
  const frame = dialFrame(Math.min(column - 4, 50), 5, 3);
  return (
    <View style={styles.strip}>
      {days.map((d) => {
        const future = d.start > now;
        const isToday = startOfDay(now) === d.start;
        return (
          <Pressable
            key={d.start}
            disabled={future}
            onPress={() => onDay(d.start)}
            accessibilityLabel={`${formatRelativeDay(d.start, now)}: ${formatDuration(d.totals.total)}, ${d.fragmentation.blocks} blocks`}
            style={[styles.day, { width: column, opacity: future ? 0.35 : 1 }]}>
            <Text style={[styles.weekday, isToday && { color: sky.accent }]}>
              {new Date(d.start).toLocaleDateString('en-GB', { weekday: 'narrow' })}
            </Text>
            <Dial
              frame={frame}
              dayStart={d.start}
              dayEnd={d.end}
              detail="mini"
              now={isToday ? now : null}
              arcs={d.segments.map((s) => ({
                key: s.entry.id,
                start: s.start,
                end: s.end,
                color: neon[s.context.hue],
                running: s.running,
              }))}
            />
            <Text style={styles.dayTotal}>{future ? ' ' : formatDuration(d.totals.total)}</Text>
            <Text style={styles.dayMeta}>
              {d.fragmentation.blocks ? `${d.fragmentation.blocks}×${formatDuration(d.fragmentation.median)}` : ' '}
            </Text>
          </Pressable>
        );
      })}
      <Text style={styles.stripLegend}>blocks × median block</Text>
    </View>
  );
}

function TargetRow({ line }: { line: TargetLine }) {
  const color = neon[line.context.hue];
  const behind = line.diff < 0;
  return (
    <View style={styles.target} accessible accessibilityLabel={formatTargetLine(line)}>
      <Gauge ratio={line.target ? line.actual / line.target : 0} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={styles.targetName} numberOfLines={1}>
          {line.context.glyph ? `${line.context.glyph}  ` : ''}
          {line.context.name}
        </Text>
        <Text style={styles.targetNumbers}>
          {formatDuration(line.actual)} <Text style={{ color: sky.faint }}>/ {formatDuration(line.target)}</Text>
        </Text>
      </View>
      <View style={[styles.diff, { backgroundColor: alpha(behind ? sky.warn : sky.accent, 0.12) }]}>
        <Text style={[styles.diffText, { color: behind ? sky.warn : sky.accent }]}>{formatSignedDuration(line.diff)}</Text>
      </View>
    </View>
  );
}

function DayReportView({ day, now }: { day: number; now: number }) {
  const report = useDayReport(day);
  const { width } = useWindowDimensions();
  const frame = dialFrame(Math.min(width - 120, 250), 12, 24);
  const f = report.fragmentation;
  return (
    <View>
      <Pressable
        onPress={() => router.navigate({ pathname: '/orbit/day', params: { date: dayParam(day) } })}
        style={styles.dayRing}
        accessibilityRole="button"
        accessibilityLabel="Open this day">
        <Dial
          frame={frame}
          dayStart={report.start}
          dayEnd={report.end}
          now={now < report.end ? now : null}
          arcs={report.segments.map((s) => ({ key: s.entry.id, start: s.start, end: s.end, color: neon[s.context.hue], running: s.running }))}
        />
        <View style={[StyleSheet.absoluteFill, styles.dayCenter]} pointerEvents="none">
          <Text style={styles.dayBig}>{formatDuration(report.totals.total)}</Text>
          <Label>tracked</Label>
        </View>
      </Pressable>
      <View style={styles.fragments}>
        <Fact value={String(f.blocks)} label={f.blocks === 1 ? 'block' : 'blocks'} />
        <Fact value={f.blocks ? formatDuration(f.median) : '–'} label="median block" />
        <Fact value={f.blocks ? formatDuration(report.totals.total / f.blocks) : '–'} label="average" />
      </View>
      <View style={styles.section}>
        <Label style={styles.sectionLabel}>Where the day went</Label>
        <TotalsTree totals={report.totals} range={{ start: report.start, end: report.end }} now={now} />
      </View>
    </View>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Label>{label}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  title: { fontFamily: font.display, fontSize: 28, color: sky.text, letterSpacing: -0.8 },
  switch: { flexDirection: 'row', padding: 3, borderRadius: 20, borderWidth: 1, borderColor: sky.hairlineHi, backgroundColor: 'rgba(255,255,255,0.03)' },
  switchItem: { height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: 'center' },
  switchActive: {
    backgroundColor: sky.accent,
    shadowColor: sky.accent,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  switchText: { fontFamily: font.textBold, fontSize: 13.5, color: sky.dim },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginTop: 6 },
  range: { flex: 1, textAlign: 'center', fontFamily: font.textBold, fontSize: 16, color: sky.text },
  hero: { alignItems: 'center', marginTop: 6, marginBottom: 14 },
  big: { fontFamily: font.display, fontSize: 46, color: sky.text, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  strip: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  day: { alignItems: 'center', gap: 4 },
  weekday: { fontFamily: font.mono, fontSize: 11, color: sky.dim },
  dayTotal: { fontFamily: font.mono, fontSize: 11.5, color: sky.text, marginTop: 2 },
  dayMeta: { fontFamily: font.mono, fontSize: 9.5, color: sky.faint, lineHeight: 12 },
  stripLegend: { width: '100%', textAlign: 'center', marginTop: 8, fontFamily: font.mono, fontSize: 9.5, letterSpacing: 1, color: sky.faint, textTransform: 'uppercase' },
  section: { marginTop: 26, paddingHorizontal: 8 },
  sectionLabel: { marginLeft: 14, marginBottom: 6 },
  target: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 8 },
  targetName: { fontFamily: font.textMedium, fontSize: 16, color: sky.text },
  targetNumbers: { marginTop: 3, fontFamily: font.mono, fontSize: 13.5, color: sky.text },
  diff: { paddingHorizontal: 10, height: 30, borderRadius: 15, justifyContent: 'center' },
  diffText: { fontFamily: font.monoBold, fontSize: 13 },
  dayRing: { alignSelf: 'center', marginTop: 4 },
  dayCenter: { alignItems: 'center', justifyContent: 'center' },
  dayBig: { fontFamily: font.display, fontSize: 34, color: sky.text, letterSpacing: -1 },
  fragments: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14, paddingHorizontal: 16 },
  fact: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 4,
  },
  factValue: { fontFamily: font.display, fontSize: 18, color: sky.text },
});
