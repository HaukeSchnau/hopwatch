// Pieces for making a jelly in React Native (onboarding): the gummy hue picker and the
// emoji well with quick picks. The editor sheet uses the same emoji list in SwiftUI.

import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Hue, hues } from '@/core';
import { characterText } from '@/i18n/character';
import { welcomeText } from '@/i18n/welcome';

import { buzz } from './feedback';
import { useTheme } from './theme';
import { CandySurface, Squishy } from './ui';

/** Emoji offered when making a jelly; any other emoji can be typed. */
export const EMOJI_SUGGESTIONS = ['💼', '🐕', '🏠', '🧪', '🎧', '🤝', '💻', '📚', '🏃', '🍳', '🛒', '🎨', '✍️', '🧘', '🎮', '👶', '🌱', '📞', '☕️', '🚀'];

/** The first user-perceived character of a string, so "🧑‍💻x" keeps the whole emoji. */
export function firstGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if ('Segmenter' in Intl) {
    const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed);
    return first?.segment ?? '';
  }
  return Array.from(trimmed)[0] ?? '';
}

/** A row of gummy drops, one per hue. */
export function HuePicker({ value, onChange }: { value: Hue; onChange: (hue: Hue) => void }) {
  const t = useTheme();
  return (
    <View style={styles.hues}>
      {hues.map((hue) => {
        const selected = value === hue;
        return (
          <Squishy
            key={hue}
            amount={0.18}
            onPress={() => {
              buzz.tick();
              onChange(hue);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={characterText.hues[hue]}>
            <View style={[styles.ring, selected && { borderColor: t.candy[hue].fill }]}>
              <CandySurface hue={hue} radius={20} flat style={[styles.drop, selected && { transform: [{ scale: 1.08 }] }]}>
                {selected && <SymbolView name="checkmark" size={14} tintColor={t.candy[hue].on} weight="heavy" />}
              </CandySurface>
            </View>
          </Squishy>
        );
      })}
    </View>
  );
}

/**
 * A big emoji well you can type into, with quick picks beside it. `suggested` marks an
 * emoji the on-device model picked, until it's touched.
 */
export function EmojiField({ value, onChange, suggested }: { value: string | null; onChange: (emoji: string) => void; suggested?: boolean }) {
  const t = useTheme();
  const input = useRef<TextInput>(null);
  return (
    <View style={styles.emojiRow}>
      <Squishy amount={0.12} onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel={suggested ? welcomeText.suggestedEmoji : welcomeText.typeEmoji}>
        <View style={[styles.emojiWell, { backgroundColor: t.c.card, borderColor: suggested ? t.c.pink : t.c.line }]}>
          <Text style={[styles.emojiBig, !value && { opacity: 0.35 }]}>{value ?? '🙂'}</Text>
          {suggested && (
            <View style={[styles.sparkle, { backgroundColor: t.c.pink }]}>
              <SymbolView name="sparkles" size={11} tintColor="#FFFFFF" weight="bold" />
            </View>
          )}
          <TextInput
            ref={input}
            value=""
            onChangeText={(typed) => {
              const emoji = firstGrapheme(typed);
              if (emoji) {
                onChange(emoji);
                input.current?.blur();
              }
            }}
            style={styles.hiddenInput}
            caretHidden
            autoCorrect={false}
          />
        </View>
      </Squishy>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
        {EMOJI_SUGGESTIONS.map((e) => (
          <Squishy
            key={e}
            amount={0.16}
            onPress={() => {
              buzz.tick();
              onChange(e);
            }}
            accessibilityLabel={e}>
            <View style={[styles.suggestion, { backgroundColor: t.c.sunken }, value === e && { backgroundColor: t.candy.pink.tint, borderColor: t.c.pink, borderWidth: 2 }]}>
              <Text style={styles.emojiSmall}>{e}</Text>
            </View>
          </Squishy>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hues: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 7, rowGap: 4 },
  ring: { padding: 3, borderRadius: 26, borderWidth: 2.5, borderColor: 'transparent' },
  drop: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emojiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiWell: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  emojiBig: { fontSize: 34 },
  sparkle: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  suggestions: { gap: 6, paddingRight: 10, alignItems: 'center' },
  suggestion: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emojiSmall: { fontSize: 22 },
});
