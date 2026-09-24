import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { actions, type ContextId, useRecents } from '@/core';

import { Print } from '../Body';
import { Key } from '../Key';
import { body, capColor, capDark, capNeutral } from '../theme';

/**
 * Recently used contexts that aren't pinned, as a row of small function keys, after an
 * ALL key that opens the whole tree.
 */
export function Recents({ onRewind }: { onRewind: (id: ContextId) => void }) {
  const recents = useRecents(8);
  return (
    <View style={styles.row}>
      <Key color={capDark} height={42} width={62} depth={6} radius={9} onPress={() => router.push('/deck/browse')} capStyle={styles.center} accessibilityLabel="All contexts">
        <Print size={9} weight="bold" color="#F4F1EA" spacing={1.2}>
          ALL
        </Print>
      </Key>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}>
        {recents.map((c) => (
          <Key
            key={c.id}
            color={capNeutral}
            height={42}
            depth={6}
            radius={9}
            accessibilityLabel={`Start ${c.name}`}
            onPress={() => actions.start(c.id)}
            onLongPress={() => onRewind(c.id)}
            capStyle={styles.recentCap}>
            <View style={[styles.chip, { backgroundColor: capColor[c.hue] }]} />
            {c.glyph ? (
              <Text allowFontScaling={false} style={styles.emoji}>
                {c.glyph}
              </Text>
            ) : null}
            <Print size={9} weight="bold" color={body.ink} numberOfLines={1} spacing={0.5} style={styles.name}>
              {c.name}
            </Print>
          </Key>
        ))}
        {recents.length === 0 ? (
          <View style={styles.empty}>
            <Print size={8} color={body.ink3}>
              UNPINNED CONTEXTS YOU USE SHOW UP HERE
            </Print>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { marginRight: -16 },
  scrollContent: { gap: 10, paddingLeft: 8, paddingRight: 20, paddingVertical: 5, alignItems: 'center' },
  recentCap: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11 },
  chip: { width: 8, height: 8, borderRadius: 2 },
  emoji: { fontSize: 14 },
  name: { maxWidth: 130 },
  empty: { justifyContent: 'center', height: 42, paddingLeft: 4 },
});
