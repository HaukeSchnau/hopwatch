import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDays, formatDayMonth, formatRelativeDay, formatWeekday, startOfDay, useDayReport, useNow } from '@/core';

import { parseDayParam } from '../dates';
import { dialFrame } from '../geometry';
import { useTabBarClearance } from '../TabBar';
import { font, sky } from '../theme';
import { IconButton, Label } from '../ui';
import { DayRing } from './DayRing';
import { EntryList } from './EntryList';

/**
 * One day as a ring with the entries listed underneath. `?date=YYYY-MM-DD` opens a
 * specific day.
 */
export function DayScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const { width } = useWindowDimensions();
  const now = useNow(15_000);
  const today = startOfDay(now);
  const [picked, setPicked] = useState<{ param: string | undefined; day: number } | null>(null);
  // A new ?date param wins over the day picked with the arrows.
  const day = picked && picked.param === params.date ? picked.day : (parseDayParam(params.date) ?? today);
  const report = useDayReport(day);
  const frame = dialFrame(Math.min(width - 40, 330), 16, 26);

  const go = (delta: -1 | 1) => {
    const next = addDays(day, delta);
    if (next > today) return;
    Haptics.selectionAsync();
    setPicked({ param: params.date, day: next });
  };

  // The ring stays put while the list scrolls under it, so dragging an arc end never
  // fights the scroll view.
  return (
    <View style={{ flex: 1, paddingTop: insets.top + 4 }}>
      <View style={styles.header}>
        <IconButton name="chevron.left" onPress={() => go(-1)} accessibilityLabel="Previous day" color={sky.text} />
        <View style={styles.titles}>
          <Text style={styles.title}>{formatRelativeDay(day, now)}</Text>
          <Label>
            {formatWeekday(day)} {formatDayMonth(day)}
          </Label>
        </View>
        {day < today ? (
          <IconButton name="chevron.right" onPress={() => go(1)} accessibilityLabel="Next day" color={sky.text} />
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
      <Animated.View key={day} entering={FadeIn.duration(240)} style={styles.ring}>
        <DayRing
          frame={frame}
          report={report}
          now={now}
          onTapEntry={(id) => router.push({ pathname: '/orbit/entry/[id]', params: { id } })}
          onTapGap={(gap, at) =>
            router.push({ pathname: '/orbit/fill', params: { start: String(gap.start), end: String(gap.end), at: String(at) } })
          }
          onSwipe={go}
        />
      </Animated.View>
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: clearance }}>
        <EntryList report={report} now={now} />
        {day < today && (
          <Text style={styles.jump} onPress={() => setPicked({ param: params.date, day: today })}>
            Back to today
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
  titles: { flex: 1, alignItems: 'center', gap: 2 },
  title: { fontFamily: font.display, fontSize: 22, color: sky.text, letterSpacing: -0.5 },
  ring: { alignItems: 'center', marginTop: -2 },
  list: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: sky.hairline,
  },
  jump: { alignSelf: 'center', marginTop: 18, padding: 12, fontFamily: font.textBold, fontSize: 14, color: sky.accent },
});
