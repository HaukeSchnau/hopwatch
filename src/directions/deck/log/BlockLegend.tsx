import { StyleSheet, Text, View } from 'react-native';

import type { ResolvedContext } from '@/core';

import { Print } from '../Body';

/** What's printed inside a block on the tape, as much as its height allows. */
export function BlockLegend({ context, ink, height }: { context: ResolvedContext; ink: string; height: number }) {
  if (height < 17) return null;
  return (
    <View style={styles.legend}>
      {context.glyph ? (
        <Text allowFontScaling={false} style={styles.emoji}>
          {context.glyph}
        </Text>
      ) : null}
      <Print size={8.5} weight="bold" color={ink} numberOfLines={1} spacing={0.5} style={styles.name}>
        {context.name}
      </Print>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 7, height: 16, marginTop: 1 },
  emoji: { fontSize: 10 },
  name: { flex: 1 },
});
