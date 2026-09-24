// Form pieces for making and editing jellies: the gummy hue picker, the emoji field
// and a chunky stepper. Shared by onboarding and the context editor.

import { SymbolView } from 'expo-symbols';
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Hue, hues } from '@/core';

import { buzz } from './feedback';
import { candy, colors, fonts } from './theme';
import { CandySurface, Squishy } from './ui';

interface HuePickerProps {
  value: Hue | null;
  onChange: (hue: Hue | null) => void;
  /** Offer "same as parent" (null) with the parent's hue shown. */
  inherit?: Hue | null;
}

/** A row of gummy drops, one per hue. */
export function HuePicker({ value, onChange, inherit }: HuePickerProps) {
  // With the extra "same as parent" swatch, 13 drops still fit two rows when a bit smaller.
  const compact = inherit !== undefined && inherit !== null;
  const size = compact ? 34 : 40;
  return (
    <View style={[styles.hues, compact && { columnGap: 5 }]}>
      {inherit !== undefined && inherit !== null && (
        <Squishy
          amount={0.18}
          onPress={() => onChange(null)}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === null }}
          accessibilityLabel="Same color as the parent">
          <View
            style={[
              styles.drop,
              styles.inherit,
              { width: size, height: size, borderColor: candy[inherit].fill },
              value === null && styles.selectedRing,
            ]}>
            <SymbolView name="arrow.turn.down.right" size={14} tintColor={candy[inherit].deep} weight="bold" />
          </View>
        </Squishy>
      )}
      {hues.map((hue) => {
        const selected = value === hue;
        return (
          <Squishy
            key={hue}
            amount={0.18}
            onPress={() => onChange(hue)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={hue}>
            <View style={[styles.ring, selected && { borderColor: candy[hue].fill }]}>
              <CandySurface
                hue={hue}
                radius={size / 2}
                flat
                style={[styles.drop, { width: size, height: size }, selected && { transform: [{ scale: 1.08 }] }]}>
                {selected && <SymbolView name="checkmark" size={14} tintColor={candy[hue].on} weight="heavy" />}
              </CandySurface>
            </View>
          </Squishy>
        );
      })}
    </View>
  );
}

const suggestions = ['💼', '🐕', '🏠', '🧪', '🎧', '🤝', '💻', '📚', '🏃', '🍳', '🛒', '🎨', '✍️', '🧘', '🎮', '👶', '🌱', '📞'];

/** A big emoji well you can type into, with quick picks beside it. */
export function EmojiField({ value, onChange, fallback }: { value: string | null; onChange: (emoji: string | null) => void; fallback?: string | null }) {
  const input = useRef<TextInput>(null);
  return (
    <View style={styles.emojiRow}>
      <Squishy amount={0.12} onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="Type an emoji">
        <View style={styles.emojiWell}>
          <Text style={[styles.emojiBig, !value && { opacity: 0.35 }]}>{value ?? fallback ?? '🙂'}</Text>
          <TextInput
            ref={input}
            value=""
            onChangeText={(text) => {
              const typed = text.trim();
              if (typed) {
                onChange(typed);
                input.current?.blur();
              }
            }}
            style={styles.hiddenInput}
            caretHidden
            autoCorrect={false}
          />
        </View>
      </Squishy>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
        {value !== null && fallback !== undefined && (
          <Squishy onPress={() => onChange(null)} accessibilityLabel="No own emoji">
            <View style={styles.suggestion}>
              <SymbolView name="xmark" size={14} tintColor={colors.muted} weight="bold" />
            </View>
          </Squishy>
        )}
        {suggestions.map((e) => (
          <Squishy key={e} amount={0.16} onPress={() => onChange(e)} accessibilityLabel={e}>
            <View style={[styles.suggestion, value === e && styles.suggestionOn]}>
              <Text style={styles.emojiSmall}>{e}</Text>
            </View>
          </Squishy>
        ))}
      </ScrollView>
    </View>
  );
}

interface StepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  min: number;
  max: number;
  unit: string;
  /** Shown instead of the value when it's null. */
  placeholder: string;
  /** Where to start when stepping from null. */
  start: number;
}

/** A chunky − value + stepper. Null reads as the placeholder. */
export function Stepper({ value, onChange, step, min, max, unit, placeholder, start }: StepperProps) {
  const bump = (dir: 1 | -1) => {
    buzz.tick();
    if (value === null) return onChange(start);
    const next = value + dir * step;
    onChange(next < min ? null : Math.min(max, next));
  };
  return (
    <View style={styles.stepper}>
      <Squishy amount={0.16} onPress={() => bump(-1)} accessibilityLabel={`Less ${unit}`} disabled={value === null}>
        <View style={[styles.stepButton, value === null && { opacity: 0.35 }]}>
          <SymbolView name="minus" size={16} tintColor={colors.ink} weight="heavy" />
        </View>
      </Squishy>
      <Text style={[styles.stepValue, value === null && { color: colors.muted, fontSize: 16 }]}>
        {value === null ? placeholder : `${value} ${unit}`}
      </Text>
      <Squishy amount={0.16} onPress={() => bump(1)} accessibilityLabel={`More ${unit}`}>
        <View style={styles.stepButton}>
          <SymbolView name="plus" size={16} tintColor={colors.ink} weight="heavy" />
        </View>
      </Squishy>
    </View>
  );
}

const styles = StyleSheet.create({
  hues: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 7, rowGap: 4 },
  ring: { padding: 3, borderRadius: 26, borderWidth: 2.5, borderColor: 'transparent' },
  drop: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  inherit: { borderWidth: 2.5, borderStyle: 'dashed', margin: 5.5 },
  selectedRing: { backgroundColor: colors.card },
  emojiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiWell: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.line,
  },
  emojiBig: { fontSize: 34 },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  suggestions: { gap: 6, paddingRight: 10, alignItems: 'center' },
  suggestion: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunken },
  suggestionOn: { backgroundColor: candy.pink.tint, borderWidth: 2, borderColor: colors.pink },
  emojiSmall: { fontSize: 22 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 92, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: colors.ink },
});
