import { MenuView } from '@expo/ui/community/menu';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { actions, formatClock, type Running, useNow } from '@/core';

import { onStopMenu, stopMenu } from './backdate';
import { LiveTimer } from './LiveTimer';
import { Glyph } from './Glyph';
import { useTheme } from './theme';

/**
 * The running timer as a "now playing" accessory above the tab bar on Day, Report and
 * Contexts, the way Music keeps the current song in reach. Tap to go to Now.
 */
export function MiniPlayer({ running }: { running: Running }) {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const theme = useTheme();
  const hue = theme.hue(running.context.hue);
  const since = running.entry.startUtc;
  const inline = placement === 'inline';
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${running.context.name} running. Opens Now.`}
        onPress={() => router.navigate('/glass')}
        style={styles.main}>
        <View style={[styles.badge, { backgroundColor: hue.solid }]}>
          <Glyph context={running.context} size={17} />
        </View>
        {inline ? null : (
          <View style={styles.titles}>
            <Text style={[styles.name, { color: theme.label }]} numberOfLines={1}>
              {running.context.name}
            </Text>
            <Text style={[styles.since, { color: theme.secondary }]}>since {formatClock(since)}</Text>
          </View>
        )}
        <LiveTimer since={since} style={[styles.timer, { color: theme.label }]} secondsStyle={{ color: theme.tertiary }} />
      </Pressable>
      {inline ? null : <StopButton since={since} color={theme.label} />}
    </View>
  );
}

function StopButton({ since, color }: { since: number; color: string }) {
  const now = useNow(60_000);
  return (
    <MenuView shouldOpenOnLongPress actions={stopMenu(now - since)} onPressAction={({ nativeEvent }) => onStopMenu(nativeEvent.event)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop"
        hitSlop={6}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.stop();
        }}
        style={({ pressed }) => [styles.stop, { opacity: pressed ? 0.5 : 1 }]}>
        <SymbolView name="stop.fill" size={20} tintColor={color} />
      </Pressable>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  bar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 6 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  since: { fontSize: 12, fontVariant: ['tabular-nums'] },
  timer: { fontSize: 17, fontWeight: '600', marginRight: 4 },
  stop: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
