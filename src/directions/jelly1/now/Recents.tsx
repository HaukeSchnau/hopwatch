// The recents row: jelly beans for recently used contexts that aren't pinned, led by
// an "All" bean that opens the whole tree for anything else.

import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { actions, type ResolvedContext, useRecents } from '@/core';

import { candy, colors, fonts } from '../theme';
import { CandySurface, creamCandy, Squishy } from '../ui';
import { beanKey, noteSource, useAnchor } from './choreo';

export function Recents() {
  const recents = useRecents(8);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      <Squishy
        accessibilityRole="button"
        accessibilityLabel="All jellies"
        accessibilityHint="Pick any context from the whole tree"
        onPress={() => router.push({ pathname: '/jelly1/pick', params: { mode: 'start' } })}>
        <CandySurface palette={creamCandy} radius={23} style={styles.bean}>
          <SymbolView name="square.grid.2x2.fill" size={16} tintColor={colors.ink} />
          <Text style={[styles.name, { color: colors.ink }]}>All</Text>
        </CandySurface>
      </Squishy>
      {recents.map((c) => (
        <Bean key={c.id} context={c} />
      ))}
    </ScrollView>
  );
}

function Bean({ context }: { context: ResolvedContext }) {
  const anchor = useAnchor(beanKey(context.id));
  const c = candy[context.hue];
  return (
    <Squishy
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${context.name}`}
      accessibilityHint="Hold to start it at an earlier time"
      onPress={() => {
        noteSource(context.id, beanKey(context.id));
        actions.start(context.id);
      }}
      onLongPress={() => router.push({ pathname: '/jelly1/start', params: { context: context.id } })}>
      <View ref={anchor}>
        <CandySurface hue={context.hue} radius={23} style={styles.bean}>
          {context.glyph ? <Text style={styles.emoji}>{context.glyph}</Text> : null}
          <Text style={[styles.name, { color: c.on }]} numberOfLines={1}>
            {context.name}
          </Text>
        </CandySurface>
      </View>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, overflow: 'visible' },
  row: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 10 },
  bean: { height: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: 220 },
  emoji: { fontSize: 18 },
  name: { fontFamily: fonts.display, fontSize: 16 },
});
