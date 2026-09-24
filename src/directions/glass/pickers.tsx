import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type Hue, hues } from '@/core';

import { Glass } from './Glass';
import { useTheme } from './theme';

/** Emoji offered when creating a context; any other emoji can be typed. */
export const EMOJI_SUGGESTIONS = [
  '💼', '🧑‍💻', '🎧', '🗣️', '🤝', '🚀', '📚', '✍️', '🎨', '🧪', '🏠', '🐕',
  '🍳', '🛒', '🥪', '🏃', '🧘', '🎓', '🎸', '🌱', '🧹', '👶', '🚗', '☕️',
];

/** The first user-perceived character of a string, so "🧑‍💻x" keeps the whole emoji. */
export function firstGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed);
    return first?.segment ?? '';
  }
  return Array.from(trimmed)[0] ?? '';
}

/** Twelve Apple-system swatches in two rows. */
export function HueSwatches({ value, onChange }: { value: Hue | null; onChange: (hue: Hue) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.swatches}>
      {hues.map((hue) => {
        const selected = value === hue;
        const colors = theme.hue(hue);
        return (
          <Pressable
            key={hue}
            accessibilityRole="radio"
            accessibilityLabel={hue}
            accessibilityState={{ selected }}
            hitSlop={4}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(hue);
            }}
            style={[styles.swatchRing, { borderColor: selected ? colors.solid : 'transparent' }]}>
            <View style={[styles.swatch, { backgroundColor: colors.solid }]}>
              {selected ? <SymbolView name="checkmark" size={14} weight="bold" tintColor={colors.onSolid} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A horizontal row of emoji suggestions on glass. */
export function EmojiRow({ value, onChange }: { value: string | null; onChange: (emoji: string) => void }) {
  const theme = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow} keyboardShouldPersistTaps="handled">
      {EMOJI_SUGGESTIONS.map((emoji) => {
        const selected = value === emoji;
        return (
          <Pressable
            key={emoji}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(emoji);
            }}>
            <Glass interactive tint={selected ? theme.fill : undefined} style={[styles.emojiCell, selected && { borderColor: theme.label, borderWidth: 2 }]}>
              <Text style={styles.emoji}>{emoji}</Text>
            </Glass>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  swatchRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, padding: 3 },
  swatch: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emojiRow: { gap: 8, paddingHorizontal: 20 },
  emojiCell: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
});
