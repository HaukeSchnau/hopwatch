import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  addDays,
  type DayReport,
  type EntryId,
  formatDuration,
  formatLongDay,
  formatRelativeDay,
  startOfDay,
  startOfWeek,
  useDayReport,
  useEntries,
  useNow,
} from '@/core';

import { Ambient } from '../Ambient';
import { Glass, GlassButton } from '../Glass';
import { numeric, useTheme } from '../theme';
import { Timeline } from './Timeline';

/** Parses `?date=2026-09-24` for testing and deep links; defaults to today. */
function initialDay(param: string | undefined): number {
  if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [y, m, d] = param.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }
  return startOfDay(Date.now());
}

/**
 * The Day tab: a week strip to hop between days (or swipe the timeline sideways), the
 * day's total and fragmentation, and the timeline. The room stays still here so the
 * blocks are easy to read.
 */
export function DayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const [day, setDay] = useState(() => initialDay(params.date));
  const [selectedId, setSelectedId] = useState<EntryId | null>(null);
  const report = useDayReport(day);
  const insets = useSafeAreaInsets();

  const go = (next: number) => {
    Haptics.selectionAsync();
    setSelectedId(null);
    setDay(startOfDay(next));
  };
  const step = (days: number) => {
    const next = addDays(day, days);
    if (next <= Date.now()) go(next);
  };

  // Swiping sideways on the timeline pages between days, like Calendar.
  const shift = useSharedValue(0);
  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      shift.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -70) scheduleOnRN(step, 1);
      else if (e.translationX > 70) scheduleOnRN(step, -1);
      shift.value = withSpring(0, { damping: 18, stiffness: 220 });
    });
  const shifted = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));

  return (
    <View style={styles.screen}>
      <Ambient still />
      <View style={{ paddingTop: insets.top + 4 }}>
        <Header day={day} report={report} onChange={go} />
      </View>
      <GestureDetector gesture={swipe}>
        <Animated.View style={[styles.timeline, shifted]}>
          <Timeline report={report} selectedId={selectedId} onSelect={setSelectedId} />
        </Animated.View>
      </GestureDetector>
      {selectedId ? <EditHint onDone={() => setSelectedId(null)} /> : null}
    </View>
  );
}

function Header({ day, report, onChange }: { day: number; report: DayReport; onChange: (day: number) => void }) {
  const theme = useTheme();
  const now = useNow(60_000);
  const today = startOfDay(now);
  const relative = formatRelativeDay(day, now);
  const title = relative === 'Today' || relative === 'Yesterday' ? relative : formatLongDay(day).split(' ')[0];
  const { blocks, median } = report.fragmentation;
  return (
    <View style={styles.header}>
      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, { color: theme.secondary }]} numberOfLines={1}>
          {formatLongDay(day).toUpperCase()}
        </Text>
        {day !== today ? (
          <Pressable onPress={() => onChange(today)} accessibilityRole="button" hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Text style={[styles.todayText, { color: theme.hue('red').solid }]}>Today</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.label }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {title}
        </Text>
        <Host matchContents style={styles.picker}>
          <DatePicker
            selection={new Date(day)}
            range={{ end: new Date(now) }}
            displayedComponents={['date']}
            onDateChange={(date) => onChange(date.getTime())}
            modifiers={[datePickerStyle('compact'), labelsHidden()]}
          />
        </Host>
      </View>
      <Text style={[styles.stats, { color: theme.secondary }]}>
        {report.totals.total > 0
          ? `${formatDuration(report.totals.total)} tracked · ${blocks} ${blocks === 1 ? 'block' : 'blocks'} · median ${formatDuration(median)}`
          : day > today
            ? 'Nothing yet.'
            : 'Nothing tracked. Tap the timeline to add what happened.'}
      </Text>
      <DayMix report={report} />
      <WeekStrip day={day} onChange={onChange} />
    </View>
  );
}

/** A Screen Time-style bar: the day's time split by top-level context. */
function DayMix({ report }: { report: DayReport }) {
  const theme = useTheme();
  if (report.totals.total === 0) return null;
  return (
    <View style={[styles.mix, { backgroundColor: theme.fill }]}>
      {report.totals.roots.map((node) => (
        <View
          key={node.context.id}
          style={{ flex: node.total / report.totals.total, backgroundColor: theme.hue(node.context.hue).solid }}
        />
      ))}
    </View>
  );
}

/** Seven days, Monday first. Chevrons page by week; dots mark days with entries. */
function WeekStrip({ day, onChange }: { day: number; onChange: (day: number) => void }) {
  const theme = useTheme();
  const entries = useEntries();
  const now = useNow(60_000);
  const today = startOfDay(now);
  const { width } = useWindowDimensions();
  const weekStart = startOfWeek(day);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const cell = Math.floor((width - 32 - 2 * 32) / 7);
  const tracked = new Set(entries.map((e) => startOfDay(e.startUtc)));
  return (
    <View style={styles.week}>
      <GlassButton symbol="chevron.left" label="Previous week" size={32} onPress={() => onChange(addDays(day, -7))} />
      {days.map((d) => {
        const selected = d === day;
        const future = d > today;
        const date = new Date(d);
        return (
          <Pressable
            key={d}
            disabled={future}
            accessibilityRole="button"
            accessibilityLabel={formatLongDay(d)}
            accessibilityState={{ selected }}
            onPress={() => onChange(d)}
            style={[styles.dayCell, { width: cell }]}>
            <Text style={[styles.weekday, { color: d === today ? theme.hue('red').solid : theme.secondary }]}>
              {'MTWTFSS'[(date.getDay() + 6) % 7]}
            </Text>
            <View style={[styles.dateCircle, selected && { backgroundColor: d === today ? theme.hue('red').solid : theme.label }]}>
              <Text
                style={[
                  numeric,
                  styles.dateText,
                  { color: selected ? (theme.dark && d !== today ? '#000000' : '#FFFFFF') : future ? theme.tertiary : d === today ? theme.hue('red').solid : theme.label },
                ]}>
                {date.getDate()}
              </Text>
            </View>
            <View style={[styles.dot, { backgroundColor: tracked.has(d) ? theme.secondary : 'transparent' }]} />
          </Pressable>
        );
      })}
      <GlassButton
        symbol="chevron.right"
        label="Next week"
        size={32}
        onPress={() => onChange(Math.min(addDays(day, 7), today))}
      />
    </View>
  );
}

/** Floats above the tab bar while a block is selected. */
function EditHint({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hintWrap, { bottom: insets.bottom + 62 }]} pointerEvents="box-none">
      <Glass style={styles.hint}>
        <Text style={[styles.hintText, { color: theme.label }]}>Drag the dots to adjust</Text>
        <Pressable onPress={onDone} accessibilityRole="button" hitSlop={8} style={[styles.hintDone, { backgroundColor: theme.label }]}>
          <Text style={[styles.hintDoneText, { color: theme.dark ? '#000000' : '#FFFFFF' }]}>Done</Text>
        </Pressable>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: -6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  kicker: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  title: { flex: 1, fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  todayText: { fontSize: 15, fontWeight: '600' },
  picker: {},
  stats: { ...numeric, fontSize: 15, fontWeight: '500', paddingHorizontal: 4 },
  mix: { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', marginHorizontal: 4, gap: 1.5 },
  week: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  dayCell: { alignItems: 'center', gap: 3 },
  weekday: { fontSize: 11, fontWeight: '600' },
  dateCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 17, fontWeight: '600' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  timeline: { flex: 1 },
  hintWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 50, borderRadius: 25, paddingLeft: 18, paddingRight: 7 },
  hintText: { fontSize: 15, fontWeight: '600' },
  hintDone: { height: 36, borderRadius: 18, paddingHorizontal: 16, justifyContent: 'center' },
  hintDoneText: { fontSize: 15, fontWeight: '700' },
});
