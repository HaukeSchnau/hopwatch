// The recents row: jelly beans for recently used contexts that aren't pinned, led by
// an "All" bean that opens the whole tree for anything else. Hold a bean for the native
// backdating menu.

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { actions, type ResolvedContext, useNow, useRecents } from '@/core';
import { menuText } from '@/i18n/menus';
import { nowText } from '@/i18n/now';

import { Menu } from '../Menu';
import { onStartMenu, useStartMenu } from '../menus';
import { rounded, useTheme } from '../theme';
import { CandySurface, Icon, Squishy } from '../ui';
import { beanKey, noteSource, useAnchor } from './choreo';

export function Recents() {
  const t = useTheme();
  const recents = useRecents(8);
  const now = useNow(60_000);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      <Squishy
        accessibilityRole="button"
        accessibilityLabel={nowText.allLabel}
        accessibilityHint={nowText.allHint}
        onPress={() => router.push({ pathname: '/pick', params: { mode: 'start' } })}>
        <CandySurface palette={t.plainCandy} radius={22} style={styles.bean}>
          <Icon name={{ ios: 'square.grid.2x2.fill', android: 'grid_view' }} size={15} color={t.plainCandy.on} />
          <Text style={[styles.name, { color: t.plainCandy.on }]}>{nowText.all}</Text>
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
  const menu = useStartMenu(context, now, false);
  return (
    <Menu title={context.name} items={menu} onPress={(id) => onStartMenu(context.id, id, beanKey(context.id))}>
      <Squishy
        accessibilityRole="button"
        accessibilityLabel={nowText.switchTo(context.name)}
        accessibilityHint={menuText.startHint}
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
    </Menu>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, overflow: 'visible' },
  row: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 10, alignItems: 'center' },
  bean: { height: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: 220 },
  emoji: { fontSize: 18 },
  name: { ...rounded('700'), fontSize: 16 },
});
