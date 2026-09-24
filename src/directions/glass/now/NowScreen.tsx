import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatLongDay, useNow } from '@/core';

import { Ambient } from '../Ambient';
import { GlassButton } from '../Glass';
import { useTheme } from '../theme';
import { Recents } from './Recents';
import { RunningCard } from './RunningCard';
import { SwitchButton } from './SwitchButton';
import { SIDE, TileGrid } from './TileGrid';

/**
 * The switcher, and where the app opens: the running card, "Back to X", recents and
 * the pinned grid, over the room tinted by whatever runs.
 */
export function NowScreen() {
  const theme = useTheme();
  return (
    <View style={styles.screen}>
      <Ambient />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Today />
            <Text style={[styles.title, { color: theme.label }]}>Now</Text>
          </View>
          <GlassButton symbol="gearshape" label="Settings" onPress={() => router.push('/glass/settings')} />
        </View>
        <View style={styles.hero}>
          <RunningCard />
          <SwitchButton />
        </View>
        <View style={styles.recents}>
          <Recents />
        </View>
        <TileGrid />
      </ScrollView>
    </View>
  );
}

/** The date above the title, refreshed each minute on its own. */
function Today() {
  const theme = useTheme();
  const now = useNow(60_000);
  return <Text style={[styles.date, { color: theme.secondary }]}>{formatLongDay(now).toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 120 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: SIDE + 4,
    paddingRight: SIDE,
    paddingTop: 8,
    marginBottom: 14,
  },
  headerText: { flex: 1 },
  date: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4, marginTop: 1 },
  hero: { paddingHorizontal: SIDE, gap: 12 },
  recents: { marginTop: 22, marginBottom: 16 },
});
