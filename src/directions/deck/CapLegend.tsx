import { StyleSheet, Text, View } from 'react-native';

import type { Hue, ResolvedContext } from '@/core';

import { Print } from './Body';
import { capColor, legendOn } from './theme';

interface LegendProps {
  name: string;
  glyph: string | null;
  hue: Hue;
  /** The parent's name, printed small above the name. */
  parent?: string;
  size?: 'regular' | 'large';
}

/** The printing on a context's keycap: emoji top left, parent and name at the bottom. */
export function CapLegend({ name, glyph, hue, parent, size = 'regular' }: LegendProps) {
  const ink = legendOn(capColor[hue]);
  const large = size === 'large';
  return (
    <View style={styles.legend}>
      <Text allowFontScaling={false} style={[styles.emoji, large && styles.emojiLarge]}>
        {glyph ?? ' '}
      </Text>
      <View style={styles.bottom}>
        {parent ? (
          <Print size={large ? 8.5 : 7} color={ink} style={styles.parent} numberOfLines={1} spacing={0.6}>
            {parent} ›
          </Print>
        ) : null}
        <Print size={large ? 12 : 9.5} weight="bold" color={ink} numberOfLines={2} spacing={0.4} style={large ? styles.nameLarge : styles.name}>
          {name}
        </Print>
      </View>
    </View>
  );
}

/** Legend props for a context from the tree. */
export const legendOf = (c: ResolvedContext): LegendProps => ({
  name: c.name,
  glyph: c.glyph,
  hue: c.hue,
  parent: c.ancestors.at(-1)?.name,
});

const styles = StyleSheet.create({
  legend: { flex: 1, justifyContent: 'space-between' },
  emoji: { fontSize: 18, lineHeight: 22 },
  emojiLarge: { fontSize: 26, lineHeight: 32 },
  bottom: { gap: 1 },
  parent: { opacity: 0.72 },
  name: { lineHeight: 13 },
  nameLarge: { lineHeight: 16 },
});
