import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Hue, hues } from '@/core';

import { alpha, font, neon, sky } from './theme';

/**
 * Twelve hue orbs. With `inherited`, a thirteenth orb stands for "use the parent's
 * color" and selects null.
 */
export function HuePicker({
  value,
  onChange,
  inherited,
}: {
  value: Hue | null;
  onChange: (hue: Hue | null) => void;
  inherited?: Hue;
}) {
  // Two even rows: 6 + 6, or 7 + 6 with the inherit orb.
  const basis = `${100 / (inherited ? 7 : 6)}%` as const;
  return (
    <View style={styles.hues}>
      {inherited && (
        <HueOrb color={neon[inherited]} selected={value === null} onPress={() => onChange(null)} label="Inherit" basis={basis}>
          <SymbolView name="arrow.turn.left.up" size={13} tintColor={sky.text} weight="bold" />
        </HueOrb>
      )}
      {hues.map((hue) => (
        <HueOrb key={hue} color={neon[hue]} selected={value === hue} onPress={() => onChange(hue)} label={hue} basis={basis} />
      ))}
    </View>
  );
}

function HueOrb({
  color,
  selected,
  onPress,
  label,
  basis,
  children,
}: {
  color: string;
  selected: boolean;
  onPress: () => void;
  label: string;
  basis: `${number}%`;
  children?: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.hueHit, { width: basis }]}>
      <View
        style={[
          styles.hueRing,
          { borderColor: selected ? color : 'transparent', shadowColor: color, shadowOpacity: selected ? 0.9 : 0 },
        ]}>
        <View style={[styles.hueCore, { backgroundColor: color, shadowColor: color }]}>{children}</View>
      </View>
    </Pressable>
  );
}

const EMOJI = [
  '💼', '🎧', '🗣️', '🤝', '🚀', '🌐', '📱', '💻', '🧪', '⏱️', '🌱', '🏠', '🐕', '🍳', '🛒', '🥪',
  '🏃', '🚲', '🧘', '📚', '✍️', '🎨', '🎮', '🎵', '☕', '🚗', '🧹', '📞', '🩺', '👶', '💤', '🎓',
];

/** An emoji field (any emoji via the keyboard) with a palette of common ones. */
export function EmojiPicker({ value, onChange }: { value: string | null; onChange: (emoji: string | null) => void }) {
  return (
    <View style={styles.emojiRow}>
      <TextInput
        value={value ?? ''}
        onChangeText={(text) => {
          const trimmed = text.trim();
          // Typing after the current emoji replaces it; the field holds one symbol.
          const typed = value && trimmed.startsWith(value) && trimmed.length > value.length ? trimmed.slice(value.length) : trimmed;
          onChange(typed || null);
        }}
        placeholder="☺︎"
        placeholderTextColor={sky.faint}
        keyboardAppearance="dark"
        style={styles.emojiInput}
        accessibilityLabel="Emoji"
        maxLength={8}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => onChange(null)} style={styles.emojiCell} accessibilityLabel="No emoji">
          <SymbolView name="circle.slash" size={20} tintColor={sky.faint} />
        </Pressable>
        {EMOJI.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(emoji);
            }}
            style={[styles.emojiCell, value === emoji && styles.emojiSelected]}>
            <Text style={styles.emoji}>{emoji}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hues: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  hueHit: { height: 48, alignItems: 'center', justifyContent: 'center' },
  hueRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  hueCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  emojiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emojiInput: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sky.hairlineHi,
    backgroundColor: 'rgba(255,255,255,0.03)',
    textAlign: 'center',
    fontSize: 28,
    color: sky.text,
  },
  palette: { gap: 2, paddingRight: 12 },
  emojiCell: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emojiSelected: { backgroundColor: alpha(sky.accent, 0.14) },
  emoji: { fontSize: 24 },
});

export const fieldStyles = StyleSheet.create({
  input: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sky.hairlineHi,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    fontFamily: font.textMedium,
    fontSize: 18,
    color: sky.text,
  },
});
