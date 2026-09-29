// The recents row: jelly beans for recently used contexts that aren't pinned, led by
// an "All" bean that opens the whole tree for anything else. Hold a bean for the native
// backdating menu.

import { MenuView } from '@expo/ui/community/menu';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { actions, type ResolvedContext, useNow, useRecents } from '@/core';

import { onStartMenu, startMenu } from '../menus';
import { useTheme } from '../theme';
import { CandySurface, Squishy } from '../ui';
import { beanKey, noteSource, useAnchor } from './choreo';

export function Recents() {
  const t = useTheme();
  const recents = useRecents(8);
  const now = useNow(60_000);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      <Squishy
        accessibilityRole="button"
        accessibilityLabel="All jellies"
        accessibilityHint="Pick any context from the whole tree"
        onPress={() => router.push({ pathname: '/jelly/pick', params: { mode: 'start' } })}>
        <CandySurface palette={t.plainCandy} radius={22} style={styles.bean}>
          <SymbolView name="square.grid.2x2.fill" size={15} tintColor={t.plainCandy.on} />
          <Text style={[styles.name, { color: t.plainCandy.on }]}>All</Text>
        </CandySurface>
      </Squishy>
      {recents.map((c) => (
        <Bean key={c.id} context={c} now={now} />
      ))}
    </ScrollView>
  );
}

function Bean({ context, now }: { context: ResolvedContext; now: number }) {
  const t = useTheme();
  const anchor = useAnchor(beanKey(context.id));
  const c = t.candy[context.hue];
  return (
    <MenuView
      shouldOpenOnLongPress
      title={context.name}
      actions={startMenu(context, now, false)}
      onPressAction={(e) => onStartMenu(context.id, e.nativeEvent.event, beanKey(context.id))}>
      <Squishy
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${context.name}`}
        accessibilityHint="Hold to start it at an earlier time"
        onPress={() => {
          noteSource(context.id, beanKey(context.id));
          actions.start(context.id);
        }}>
        <View ref={anchor}>
          <CandySurface hue={context.hue} radius={22} style={styles.bean}>
            {context.glyph ? <Text style={styles.emoji}>{context.glyph}</Text> : null}
            <Text style={[styles.name, { color: c.on }]} numberOfLines={1}>
              {context.name}
            </Text>
          </CandySurface>
        </View>
      </Squishy>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, overflow: 'visible' },
  row: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 10, alignItems: 'center' },
  bean: { height: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: 220 },
  emoji: { fontSize: 18 },
  name: { fontFamily: 'ui-rounded', fontWeight: '700', fontSize: 16 },
});
