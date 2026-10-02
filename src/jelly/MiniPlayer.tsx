// The running jelly as a "now playing" accessory above the tab bar on Day, Week and
// Stuff: its face, name, live timer and Stop (hold Stop to stop earlier). Tap to go back
// to Now. The bar renders it twice (regular and inline), so it keeps no state of its own.

import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { actions, durationParts, formatClock, type Running, useNow } from '@/core';
import { menuText } from '@/i18n/menus';
import { shellText } from '@/i18n/shell';

import { Character } from './Character';
import { buzz, play } from './feedback';
import { useFace, useLively } from './Gummy';
import { Menu } from './Menu';
import { onStopMenu, stopMenu } from './menus';
import { tabular, text, useTheme } from './theme';

export function MiniPlayer({ running }: { running: Running }) {
  const t = useTheme();
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const inline = placement === 'inline';
  const face = useFace('awake');
  useLively(face, true);
  const { context, entry } = running;
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shellText.miniPlayer(context.name)}
        onPress={() => router.navigate('/')}
        style={styles.main}>
        <Character context={context} size={inline ? 30 : 38} face={face} shadow={false} sticker={false} />
        {inline ? null : (
          <View style={styles.titles}>
            <Text style={[text.subhead, { color: t.c.ink }]} numberOfLines={1}>
              {context.name}
            </Text>
            <Text style={[text.caption, tabular, { color: t.c.muted }]}>{shellText.since(formatClock(entry.startUtc))}</Text>
          </View>
        )}
        <LiveTime since={entry.startUtc} color={t.c.ink} />
      </Pressable>
      {inline ? null : <StopButton since={entry.startUtc} name={context.name} color={t.c.ink} />}
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** h:mm:ss, ticking on its own. */
function LiveTime({ since, color }: { since: number; color: string }) {
  const now = useNow(1000);
  const { hours, minutes, seconds } = durationParts(now - since);
  return (
    <Text style={[text.headline, tabular, styles.time, { color }]}>
      {hours}:{pad(minutes)}
      <Text style={{ opacity: 0.45 }}>:{pad(seconds)}</Text>
    </Text>
  );
}

function StopButton({ since, name, color }: { since: number; name: string; color: string }) {
  const now = useNow(60_000);
  return (
    <Menu title={menuText.stop(name)} items={stopMenu(name, since, now)} onPress={onStopMenu}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={menuText.stop(name)}
        accessibilityHint={menuText.stopHint}
        hitSlop={6}
        onPress={() => {
          buzz.thud();
          actions.stop();
          play('boop');
        }}
        style={({ pressed }) => [styles.stop, { opacity: pressed ? 0.5 : 1 }]}>
        <SymbolView name="stop.fill" size={20} tintColor={color} />
      </Pressable>
    </Menu>
  );
}

const styles = StyleSheet.create({
  bar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 6 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  titles: { flex: 1 },
  time: { marginRight: 2 },
  stop: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
