import { StyleSheet, Text, View } from 'react-native';

import type { ResolvedContext } from '@/core';

import { useTheme } from './theme';

/**
 * A context's emoji, or a disc in its color with its initial when it has none, so
 * every context has a face.
 */
export function Glyph({ context, size }: { context: ResolvedContext; size: number }) {
  const theme = useTheme();
  if (context.glyph) return <Text style={{ fontSize: size, lineHeight: size * 1.2 }}>{context.glyph}</Text>;
  const hue = theme.hue(context.hue);
  const disc = size * 1.05;
  return (
    <View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, backgroundColor: hue.solid, marginVertical: size * 0.075 }]}>
      <Text style={[styles.initial, { fontSize: size * 0.55, color: hue.onSolid }]}>{context.name.trim().slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: 'ui-rounded', fontWeight: '700' },
});
