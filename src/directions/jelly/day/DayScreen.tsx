// Day: one day as jelly beans, with gaps you can tap to fill and knobs to drag. Arrows
// step through days; tapping the date jumps back to today.

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, formatDuration, startOfDay, useDayReport, useNow } from '@/core';

import { colors, fonts, TAB_BAR_HEIGHT } from '../theme';
import { dayTitles } from '../titles';
import { EdgeFade, RoundButton, Squishy } from '../ui';
import { axisFor, Timeline, yOf } from './Timeline';

export function DayScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ day?: string }>();
  const now = useNow(30_000);
  const today = startOfDay(now);
  const [day, setDay] = useState(() => (params.day ? startOfDay(Number(params.day)) : startOfDay(Date.now())));
  const report = useDayReport(day);
  const axis = axisFor(report, now);
  const isToday = day === today;

  // Scroll to where the action is: now for today, the first bean otherwise.
  const scroll = useRef<ScrollView>(null);
  const focus = isToday ? now : (report.segments[0]?.start ?? axis.start);
  const focusY = Math.max(0, yOf(focus, axis) - (isToday ? 320 : 40));
  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollTo({ y: focusY, animated: false }), 30);
    return () => clearTimeout(timer);
    // Only when the day changes, not on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const { blocks, median } = report.fragmentation;
  const titles = dayTitles(day, now);
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <RoundButton icon="chevron.left" accessibilityLabel="Previous day" onPress={() => setDay(addDays(day, -1))} />
        <Squishy outerStyle={{ flex: 1 }} style={styles.titleWrap} onPress={() => setDay(today)} accessibilityRole="button" accessibilityLabel="Jump to today">
          <Text style={styles.title}>{titles.title}</Text>
          <Text style={styles.subtitle}>{titles.subtitle}</Text>
        </Squishy>
        <RoundButton icon="chevron.right" accessibilityLabel="Next day" onPress={() => setDay(addDays(day, 1))} />
      </View>
      <View style={styles.stats}>
        <Stat value={formatDuration(report.totals.total)} label="tracked" />
        <Stat value={String(blocks)} label={blocks === 1 ? 'bean' : 'beans'} />
        <Stat value={blocks ? formatDuration(median) : '–'} label="median" />
      </View>
      <View style={styles.scroll}>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
          showsVerticalScrollIndicator={false}>
          {report.segments.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>{day > today ? '🔮' : '🫘'}</Text>
              <Text style={styles.empty}>
                {day > today ? "This day hasn't happened yet." : 'No beans this day. Tap the dotted space to add what you did.'}
              </Text>
            </View>
          )}
          <Timeline report={report} axis={axis} now={now} width={width} />
        </ScrollView>
        <EdgeFade />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.textBold, fontSize: 14, color: colors.muted, marginTop: -3 },
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#7A4E2D',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  statValue: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.textBold, fontSize: 12, color: colors.muted, marginTop: -2 },
  scroll: { flex: 1, marginTop: 6 },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.card,
  },
  emptyEmoji: { fontSize: 30 },
  empty: { flex: 1, fontFamily: fonts.text, fontSize: 15, lineHeight: 20, color: colors.muted },
});
