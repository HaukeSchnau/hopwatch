// Now: the switcher, where the app opens. Stage on top, "Back to X" under it, the
// pinned grid and the recents row below, all within thumb reach.

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDuration, formatLongDay, startOfDay, useDayReport, useNow, useRunning } from '@/core';

import { colors, fonts, TAB_BAR_HEIGHT } from '../theme';
import { Squishy } from '../ui';
import { BackPill } from './BackPill';
import { FlyerLayer } from './Flyer';
import { Grid } from './Grid';
import { Recents } from './Recents';
import { Stage } from './Stage';

export function NowScreen() {
  const insets = useSafeAreaInsets();
  const running = useRunning();
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 28 }}
        showsVerticalScrollIndicator={false}>
        <Header />
        <Stage running={running} />
        <View style={styles.gap} />
        <BackPill />
        <View style={styles.gridGap} />
        <Grid runningId={running?.context.id ?? null} />
        <Recents />
      </ScrollView>
      <FlyerLayer />
    </View>
  );
}

function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 5) return 'Night owl';
  if (h < 11) return 'Morning!';
  if (h < 17) return 'Afternoon!';
  if (h < 22) return 'Evening!';
  return 'Late one';
}

function Header() {
  const now = useNow(60_000);
  const today = useDayReport(startOfDay(now));
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.hello}>{greeting(now)}</Text>
        <Text style={styles.date}>{formatLongDay(now)}</Text>
      </View>
      <Squishy
        onPress={() => router.navigate('/jelly/day')}
        accessibilityRole="button"
        accessibilityLabel={`${formatDuration(today.totals.total)} tracked today. Open the day`}>
        <View style={styles.today}>
          <Text style={styles.todayValue}>{formatDuration(today.totals.total)}</Text>
          <Text style={styles.todayLabel}>today</Text>
        </View>
      </Squishy>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 8, paddingTop: 0 },
  hello: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.ink, letterSpacing: -0.4 },
  date: { fontFamily: fonts.textBold, fontSize: 14, color: colors.muted, marginTop: -2 },
  today: {
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    shadowColor: '#7A4E2D',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  todayValue: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  todayLabel: { fontFamily: fonts.textBold, fontSize: 11, color: colors.muted, marginTop: -3 },
  gap: { height: 12 },
  gridGap: { height: 12 },
});
