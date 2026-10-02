// Day: the candy dial as the day's overview, with the jelly-bean timeline under it for
// precise editing. Tap an arc to find its bean (tap it again for the entry), tap a dark
// stretch to fill it. The header steps through days; its title jumps back to today.
// Each day opens where the action is: today at now, a past day at its first bean.

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { addDays, type EntryId, formatDuration, startOfDay, useDayReport, useNow, useRunning } from '@/core';
import { dayText } from '@/i18n/day';
import { shellText } from '@/i18n/shell';

import { CandyDial, dayBeans } from '../dial/CandyDial';
import { dialFrame, pointDeg, pointRadius, timeAtDeg } from '../dial/geometry';
import { buzz } from '../feedback';
import { HeaderTitle } from '../HeaderTitle';
import { useHeaderIcon } from '../nav';
import { rounded, tabular, text, useTheme } from '../theme';
import { dayTitles } from '../titles';
import { axisFor, Timeline, yOf } from './Timeline';

export function DayScreen() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const header = useHeaderHeight();
  const params = useLocalSearchParams<{ day?: string }>();
  const previousIcon = useHeaderIcon('chevron.left', 'chevron_left');
  const nextIcon = useHeaderIcon('chevron.right', 'chevron_right');
  const now = useNow(30_000);
  const today = startOfDay(now);
  const [day, setDay] = useState(() => (params.day ? startOfDay(Number(params.day)) : startOfDay(Date.now())));
  const [selected, setSelected] = useState<EntryId | null>(null);
  const report = useDayReport(day);
  const running = useRunning();
  const axis = axisFor(report, now);
  const dayEnd = addDays(day, 1);
  // Today and future days: gaps can only be filled up to now. Only today shows the now pin.
  const live = now < dayEnd;
  const isToday = live && now >= day;

  // The scroll view is keyed by day, so every day starts at the top and opens once.
  const scroll = useRef<ScrollView>(null);
  const timelineTop = useRef(0);
  const opened = useRef<number | null>(null);
  const go = (next: number) => {
    buzz.tick();
    setSelected(null);
    setDay(next);
  };

  /**
   * Scrolls a freshly shown day to now (today) or its first bean (a past day), unless
   * that already shows under the dial. Runs once per day, so it never fights the user.
   */
  const open = (e: LayoutChangeEvent) => {
    timelineTop.current = e.nativeEvent.layout.y;
    if (opened.current === day) return;
    opened.current = day;
    const focus = day === today ? now : report.segments[0]?.start;
    if (focus === undefined) return;
    const y = timelineTop.current + yOf(focus, axis);
    if (header + y < height * 0.7) return;
    scroll.current?.scrollTo({ y: y - height * (day === today ? 0.55 : 0.3), animated: false });
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
        router.push({ pathname: '/entry', params: { id: hit.entry.id } });
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
        pathname: '/pick',
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
    <>
      <Stack.Title asChild>
        <HeaderTitle title={titles.title} subtitle={titles.subtitle} onPress={day === today ? undefined : () => go(today)} />
      </Stack.Title>
      <Stack.Toolbar placement="left">
        {previousIcon && (
          <Stack.Toolbar.Button icon={previousIcon} accessibilityLabel={shellText.header.previous('day')} onPress={() => go(addDays(day, -1))} />
        )}
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        {nextIcon && <Stack.Toolbar.Button icon={nextIcon} accessibilityLabel={shellText.header.next('day')} onPress={() => go(addDays(day, 1))} />}
      </Stack.Toolbar>
      <ScrollView
        key={day}
        ref={scroll}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: t.c.bg }}
        contentContainerStyle={styles.content}>
        <Pressable
          onPress={tapDial}
          accessibilityLabel={dayText.dialLabel}
          style={[styles.dial, { width: frame.size, height: frame.size }]}>
          <CandyDial frame={frame} dayStart={day} dayEnd={dayEnd} beans={beans} now={isToday ? now : null} />
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
            <Text style={[text.footnote, { color: t.c.muted }]}>{dayText.tracked}</Text>
            <Text style={[styles.total, tabular, { color: t.c.ink }]}>{formatDuration(report.totals.total)}</Text>
            <Text style={[text.footnote, tabular, { color: t.c.muted }]}>
              {dayText.beans(blocks)}
              {blocks ? dayText.median(formatDuration(median)) : ''}
            </Text>
            {day <= today && (
              <Text style={[text.caption, styles.hint, { color: t.c.faint }]}>
                {blocks ? dayText.hint : dayText.emptyHint}
              </Text>
            )}
          </View>
        </Pressable>

        {report.segments.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: t.c.card }]}>
            <Text style={styles.emptyEmoji}>{day > today ? '🔮' : '🫘'}</Text>
            <Text style={[text.subhead, styles.empty, { color: t.c.muted }]}>
              {day > today ? dayText.future : dayText.empty}
            </Text>
          </View>
        )}
        <View onLayout={open}>
          <Timeline report={report} axis={axis} now={now} width={width} selected={selected} onSelect={setSelected} />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  // Room under the last hour: scrollTo stops where the content ends behind the tab bar
  // and mini player, and the opening scroll must still be able to lift a late "now" above them.
  content: { paddingBottom: 160 },
  dial: { alignSelf: 'center', marginTop: 4 },
  center: { alignItems: 'center', justifyContent: 'center' },
  total: {
    ...rounded('800'),
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
