// Emoji and ink pickers shared by the first edition and the context editor.

import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Hue, hues } from '@/core';

import { InkCircle } from './InkCircle';
import { font, ink, paper, riso } from './theme';
import { Caps } from './type';

export const emojiChoices = [
  '💼', '🎧', '🗣️', '🤝', '💻', '🚀', '📱', '🌐', '🧪', '⏱️', '🌱', '📚',
  '✍️', '🎨', '🎸', '🏠', '🐕', '🍳', '🛒', '🥪', '☕️', '🏃', '🚲', '🧘',
  '🧹', '👶', '❤️', '📞', '✉️', '🚗', '✈️', '🛠️', '💡', '📈', '🎮', '😴',
];

/** Emoji shown before the tray is unfolded: two rows with the none cell and the toggle. */
const FOLDED = 12;

/** The first grapheme of a string, so a pasted phrase keeps only its first emoji. */
function firstGrapheme(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const Segmenter = Intl.Segmenter;
  if (Segmenter) {
    const first = new Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)[Symbol.iterator]().next();
    return first.done ? null : first.value.segment;
  }
  return Array.from(trimmed).slice(0, 2).join('');
}

/**
 * A tray of emoji to mark a context with, plus a field for any other emoji. `value`
 * null means none of its own (inherited from the parent when there is one).
 */
export function EmojiPicker({
  value,
  onChange,
  inheritLabel,
}: {
  value: string | null;
  onChange: (emoji: string | null) => void;
  /** Shown for the null choice, e.g. "Inherit 🤝". Plain "None" when absent. */
  inheritLabel?: string;
}) {
  const [custom, setCustom] = useState('');
  const isCustom = value !== null && !emojiChoices.includes(value);
  // Two rows unless the chosen mark sits further down the tray.
  const [expanded, setExpanded] = useState(() => value !== null && emojiChoices.indexOf(value) >= FOLDED);
  const shown = expanded ? emojiChoices : emojiChoices.slice(0, FOLDED);
  return (
    <View>
      <View style={styles.emojiGrid}>
        <Pressable
          accessibilityLabel={inheritLabel ?? 'No emoji'}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(null);
          }}
          style={[styles.emojiCell, value === null && styles.emojiSelected]}>
          <Text style={styles.noneText} numberOfLines={2}>
            {inheritLabel ?? 'None'}
          </Text>
        </Pressable>
        {shown.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityLabel={emoji}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(emoji);
            }}
            style={[styles.emojiCell, value === emoji && styles.emojiSelected]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Fewer emoji' : 'More emoji'}
          onPress={() => {
            Haptics.selectionAsync();
            setExpanded(!expanded);
          }}
          style={styles.emojiCell}>
          <Text style={styles.noneText}>{expanded ? 'fewer' : 'more…'}</Text>
        </Pressable>
      </View>
      <View style={styles.customRow}>
        <Caps>Or any other</Caps>
        <TextInput
          selectionColor={ink.red}
          value={isCustom ? value : custom}
          onChangeText={(text) => {
            setCustom(text);
            const emoji = firstGrapheme(text);
            if (emoji) onChange(emoji);
          }}
          placeholder="type one"
          placeholderTextColor={ink.faint}
          style={styles.customInput}
          maxLength={8}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

/**
 * The twelve riso inks as printed swatches; the chosen one gets circled in pen.
 * `allowInherit` adds a first swatch for "same as the parent".
 */
export function InkPicker({
  value,
  onChange,
  inheritHue,
}: {
  value: Hue | null;
  onChange: (hue: Hue | null) => void;
  /** The parent's ink; when set, a null choice ("inherit") is offered. */
  inheritHue?: Hue;
}) {
  const choices: (Hue | null)[] = inheritHue ? [null, ...hues] : [...hues];
  const selected = value ?? (inheritHue ? null : 'gray');
  return (
    <View>
      <View style={styles.inkGrid}>
        {choices.map((hue) => {
          const shown = hue ?? inheritHue ?? 'gray';
          const isSelected = hue === selected;
          return (
            <Pressable
              key={hue ?? 'inherit'}
              accessibilityLabel={hue ? riso[hue].name : 'Same ink as the parent'}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(hue);
              }}
              style={styles.inkCell}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: riso[shown].fill },
                  hue === null && styles.swatchInherit,
                ]}
              />
              <View style={styles.swatchKey} />
              {hue === null && <Text style={styles.inheritMark}>↑</Text>}
              {isSelected && (
                <View style={styles.swatchCircle} pointerEvents="none">
                  <InkCircle key={hue ?? 'inherit'} width={46} height={46} seed={hues.indexOf(shown) + 11} color={ink.full} strokeWidth={1.8} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.inkName}>
        {selected === null && inheritHue ? `Same as the parent · ${riso[inheritHue].name}` : riso[selected ?? 'gray'].name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  emojiCell: {
    width: 46,
    height: 46,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  emojiSelected: { borderColor: ink.full, borderWidth: 1.5, backgroundColor: paper.well },
  emoji: { fontSize: 25 },
  noneText: { fontFamily: font.textItalic, fontSize: 12, color: ink.soft, textAlign: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  customInput: {
    flex: 1,
    minHeight: 44,
    fontFamily: font.textItalic,
    fontSize: 20,
    color: ink.full,
    borderBottomWidth: 1,
    borderBottomColor: ink.rule,
  },
  inkGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  inkCell: { width: 46, height: 46, margin: 3, alignItems: 'center', justifyContent: 'center' },
  swatch: { position: 'absolute', width: 30, height: 30, borderRadius: 15, mixBlendMode: 'multiply', transform: [{ translateX: 1.5 }, { translateY: 1 }] },
  swatchInherit: { opacity: 0.45 },
  swatchKey: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: ink.full },
  inheritMark: { position: 'absolute', fontFamily: font.display, fontSize: 20, color: ink.full },
  swatchCircle: { position: 'absolute', left: 0, top: 0 },
  inkName: { marginTop: 6, fontFamily: font.textItalic, fontSize: 15, color: ink.soft },
});
