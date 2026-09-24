import { MenuView } from '@expo/ui/community/menu';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  actions,
  formatAgo,
  formatClock,
  formatDuration,
  type ResolvedContext,
  startOfDay,
  useDayReport,
  useEntries,
  useNow,
  useRunning,
  useTree,
} from '@/core';

import { onStopMenu, stopMenu } from '../backdate';
import { Glass } from '../Glass';
import { RollingTimer } from '../LiveTimer';
import { numeric, useTheme } from '../theme';

/**
 * The hero of the Now tab: the running context with its path, a big rounded timer and
 * a round Stop button. Long-press Stop for a backdated stop. When nothing runs it
 * says so calmly and points at what ran last.
 */
export function RunningCard() {
  const running = useRunning();
  return (
    <Glass style={styles.card}>{running ? <Running context={running.context} since={running.entry.startUtc} /> : <Idle />}</Glass>
  );
}

function Running({ context, since }: { context: ResolvedContext; since: number }) {
  const theme = useTheme();
  const hue = theme.hue(context.hue);
  const path = context.ancestors.map((a) => a.name).join(' › ');
  return (
    <>
      <View style={styles.head}>
        <View style={[styles.glyph, { backgroundColor: hue.solid, shadowColor: hue.solid }]}>
          <Text style={styles.glyphText}>{context.glyph ?? context.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.titles}>
          {path ? (
            <Text style={[styles.path, { color: theme.secondary }]} numberOfLines={1}>
              {path}
            </Text>
          ) : null}
          <Text style={[styles.name, { color: theme.label }]} numberOfLines={1}>
            {context.name}
          </Text>
        </View>
      </View>
      <View style={styles.timerRow}>
        <View style={styles.timerColumn}>
          <RollingTimer since={since} />
          <Text style={[styles.since, { color: theme.secondary }]} numberOfLines={1}>
            Since {formatClock(since)}
            <TodayTotal context={context} />
          </Text>
        </View>
        <StopButton since={since} />
      </View>
    </>
  );
}

/** " · 3:40 today" for the running context's subtree, when it differs from the timer. */
function TodayTotal({ context }: { context: ResolvedContext }) {
  const report = useDayReport(startOfDay(Date.now()));
  const total = report.totals.byId.get(context.id)?.total ?? 0;
  const running = report.segments.find((s) => s.running);
  if (!running || total - (running.end - running.start) < 60_000) return null;
  return ` · ${formatDuration(total)} today`;
}

function StopButton({ since }: { since: number }) {
  const theme = useTheme();
  const now = useNow(60_000);
  const red = theme.hue('red');
  return (
    <MenuView
      shouldOpenOnLongPress
      title="Stop earlier"
      actions={stopMenu(now - since)}
      onPressAction={({ nativeEvent }) => onStopMenu(nativeEvent.event)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop"
        accessibilityHint="Long-press to stop at an earlier time"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.stop();
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.9 : 1 }] })}>
        <Glass interactive tint={red.soft} style={styles.stop}>
          <SymbolView name="stop.fill" size={24} tintColor={theme.dark ? red.solid : red.ink} />
        </Glass>
      </Pressable>
    </MenuView>
  );
}

function Idle() {
  const theme = useTheme();
  const entries = useEntries();
  const tree = useTree();
  const now = useNow(60_000);
  const last = entries.length ? entries[entries.length - 1] : null;
  const lastContext = last ? tree.byId.get(last.contextId) : null;
  return (
    <View style={styles.idle}>
      <View style={[styles.glyph, { backgroundColor: theme.fill }]}>
        <SymbolView name="moon.zzz.fill" size={22} tintColor={theme.secondary} />
      </View>
      <View style={styles.titles}>
        <Text style={[styles.name, { color: theme.label }]}>Not tracking</Text>
        <Text style={[styles.path, { color: theme.secondary }]} numberOfLines={2}>
          {last?.endUtc && lastContext
            ? `${lastContext.name} stopped at ${formatClock(last.endUtc)}, ${formatAgo(now - last.endUtc)}`
            : 'Tap a tile to start the clock.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 32, padding: 20, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  glyphText: { fontSize: 22 },
  titles: { flex: 1, gap: 1 },
  path: { fontSize: 13, fontWeight: '600', letterSpacing: -0.08 },
  name: { fontSize: 22, fontWeight: '700', letterSpacing: -0.26 },
  timerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  timerColumn: { flex: 1 },
  since: { ...numeric, fontSize: 15, fontWeight: '500', marginTop: 2 },
  stop: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  idle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
});
