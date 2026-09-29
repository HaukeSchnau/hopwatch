// Day: the candy dial as the day's overview, with the jelly-bean timeline under it for
// precise editing. Tap an arc to find its bean (tap it again for the entry), tap a dark
// stretch to fill it. The header steps through days; its title jumps back to today.

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { type GestureResponderEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { addDays, type EntryId, formatDuration, startOfDay, useDayReport, useNow, useRunning } from '@/core';

import { CandyDial, dayBeans } from '../dial/CandyDial';
import { dialFrame, pointDeg, pointRadius, timeAtDeg } from '../dial/geometry';
import { buzz } from '../feedback';
import { HeaderTitle } from '../HeaderTitle';
import { tabular, text, useTheme } from '../theme';
import { dayTitles } from '../titles';
import { axisFor, Timeline, yOf } from './Timeline';

export function DayScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ day?: string }>();
  const now = useNow(30_000);
  const today = startOfDay(now);
  const [day, setDay] = useState(() => (params.day ? startOfDay(Number(params.day)) : startOfDay(Date.now())));
  const [selected, setSelected] = useState<EntryId | null>(null);
  const report = useDayReport(day);
  const running = useRunning();
  const axis = axisFor(report, now);
  const dayEnd = addDays(day, 1);
  const live = now < dayEnd;

  const scroll = useRef<ScrollView>(null);
  const timelineTop = useRef(0);
  const go = (next: number) => {
    buzz.tick();
    setSelected(null);
    setDay(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const frame = dialFrame(Math.min(width - 40, 330), 24, 20);
  const beans = dayBeans(report, running, now, selected);

  const tapDial = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y } = e.nativeEvent;
    const radius = pointRadius(frame, x, y);
    if (Math.abs(radius - frame.r) > frame.stroke / 2 + 18) return;
    const at = timeAtDeg(pointDeg(frame, x, y), day, dayEnd);
    const hit = report.segments.find((s) => s.start <= at && at < s.end);
    if (hit) {
      buzz.tick();
      if (hit.entry.id === selected) {
        router.push({ pathname: '/jelly/entry', params: { id: hit.entry.id } });
        return;
      }
      setSelected(hit.entry.id);
      // Leaves room for the header above the bean.
      const offset = timelineTop.current + yOf(hit.start, axis) - 230;
      scroll.current?.scrollTo({ y: Math.max(0, offset), animated: true });
      return;
    }
    const gap = report.gaps.find((g) => g.start <= at && at < g.end);
    if (gap && gap.start < (live ? now : dayEnd)) {
      buzz.tap();
      router.push({
        pathname: '/jelly/pick',
        params: {
          mode: 'fill',
          from: String(gap.start),
          to: String(Math.min(gap.end, live ? now : dayEnd)),
          at: String(at),
        },
      });
    }
  };

  const { blocks, median } = report.fragmentation;
  const titles = dayTitles(day, now);
  return (
    <ScrollView ref={scroll} contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: t.c.bg }} contentContainerStyle={styles.content}>
      <Stack.Title asChild>
        <HeaderTitle title={titles.title} subtitle={titles.subtitle} onPress={day === today ? undefined : () => go(today)} />
      </Stack.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="chevron.left" accessibilityLabel="Previous day" onPress={() => go(addDays(day, -1))} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="chevron.right" accessibilityLabel="Next day" onPress={() => go(addDays(day, 1))} />
      </Stack.Toolbar>

      <Pressable
        onPress={tapDial}
        accessibilityLabel="The day's dial. Tap a bean to find it, a gap to fill it"
        style={[styles.dial, { width: frame.size, height: frame.size }]}>
        <CandyDial frame={frame} dayStart={day} dayEnd={dayEnd} beans={beans} now={live ? now : null} />
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Text style={[text.footnote, { color: t.c.muted }]}>tracked</Text>
          <Text style={[styles.total, tabular, { color: t.c.ink }]}>{formatDuration(report.totals.total)}</Text>
          <Text style={[text.footnote, tabular, { color: t.c.muted }]}>
            {blocks} {blocks === 1 ? 'bean' : 'beans'}
            {blocks ? ` · median ${formatDuration(median)}` : ''}
          </Text>
          {day <= today && (
            <Text style={[text.caption, styles.hint, { color: t.c.faint }]}>
              {blocks ? 'Tap an arc to find it,\na gap to fill it' : 'Tap the ring to fill a gap'}
            </Text>
          )}
        </View>
      </Pressable>

      {report.segments.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: t.c.card }]}>
          <Text style={styles.emptyEmoji}>{day > today ? '🔮' : '🫘'}</Text>
          <Text style={[text.subhead, styles.empty, { color: t.c.muted }]}>
            {day > today ? "This day hasn't happened yet." : 'No beans this day. Tap the dotted space to add what you did.'}
          </Text>
        </View>
      )}
      <View
        onLayout={(e) => {
          timelineTop.current = e.nativeEvent.layout.y;
        }}>
        <Timeline report={report} axis={axis} now={now} width={width} selected={selected} onSelect={setSelected} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  dial: { alignSelf: 'center', marginTop: 4 },
  center: { alignItems: 'center', justifyContent: 'center' },
  total: {
    fontFamily: 'ui-rounded',
    fontWeight: '800',
    fontSize: 40,
    letterSpacing: -0.8,
    marginVertical: -1,
  },
  hint: { textAlign: 'center', marginTop: 10, lineHeight: 15 },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 22,
  },
  emptyEmoji: { fontSize: 30 },
  empty: { flex: 1, lineHeight: 20 },
});
