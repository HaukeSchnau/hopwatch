import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type ContextId, pathLabel, type ResolvedContext, usePickableContexts } from '@/core';

import { alpha, font, neon, sky } from './theme';
import { Moon } from './ui';

interface ContextPickerProps {
  onPick: (context: ResolvedContext) => void;
  selectedId?: ContextId | null;
  /** Contexts that can't be picked, e.g. a context's own subtree when moving it. */
  exclude?: ReadonlySet<ContextId>;
  /** Show the search field from this many contexts on. */
  searchFrom?: number;
}

/**
 * The context tree as a flat, indented list with guide lines. Typing filters by the
 * whole path, so "acme web" finds "Clients › Acme › Website".
 */
export function ContextPicker({ onPick, selectedId = null, exclude, searchFrom = 9 }: ContextPickerProps) {
  const all = usePickableContexts().filter((c) => !exclude?.has(c.id));
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = words.length ? all.filter((c) => words.every((w) => pathLabel(c).toLowerCase().includes(w))) : all;

  return (
    <View>
      {all.length >= searchFrom && (
        <View style={styles.search}>
          <SymbolView name="magnifyingglass" size={15} tintColor={sky.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search contexts"
            placeholderTextColor={sky.faint}
            keyboardAppearance="dark"
            autoCorrect={false}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
        </View>
      )}
      {shown.map((context) => (
        <PickerRow
          key={context.id}
          context={context}
          flat={words.length > 0}
          selected={context.id === selectedId}
          onPress={() => {
            Haptics.selectionAsync();
            onPick(context);
          }}
        />
      ))}
      {shown.length === 0 && <Text style={styles.none}>No context matches.</Text>}
    </View>
  );
}

function PickerRow({ context, flat, selected, onPress }: { context: ResolvedContext; flat: boolean; selected: boolean; onPress: () => void }) {
  const color = neon[context.hue];
  const depth = flat ? 0 : context.depth;
  const path = context.ancestors.map((a) => a.name).join(' › ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, selected && { backgroundColor: alpha(color, 0.12) }, pressed && { backgroundColor: alpha(color, 0.18) }]}>
      <Guides depth={depth} />
      <Moon context={context} size={32} filled={selected} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {context.name}
        </Text>
        {flat && path ? (
          <Text style={styles.path} numberOfLines={1}>
            {path}
          </Text>
        ) : null}
      </View>
      {selected && <SymbolView name="checkmark" size={14} tintColor={color} weight="bold" />}
    </Pressable>
  );
}

/** Vertical hairlines, one per ancestor, like a star chart's grid. */
export function Guides({ depth }: { depth: number }) {
  if (depth === 0) return null;
  return (
    <View style={[styles.guides, { width: depth * 18 }]}>
      {Array.from({ length: depth }, (_, i) => (
        <View key={i} style={styles.guideCell}>
          <View style={styles.guide} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchInput: { flex: 1, height: 44, fontFamily: font.text, fontSize: 15, color: sky.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    marginHorizontal: 6,
  },
  name: { fontFamily: font.textMedium, fontSize: 16, color: sky.text, letterSpacing: -0.2 },
  path: { marginTop: 1, fontFamily: font.mono, fontSize: 10, letterSpacing: 1, color: sky.dim, textTransform: 'uppercase' },
  guides: { flexDirection: 'row', alignSelf: 'stretch', marginRight: -4 },
  guideCell: { width: 18 },
  guide: { flex: 1, marginLeft: 8, borderLeftWidth: 1, borderColor: sky.hairlineHi },
  none: { textAlign: 'center', padding: 24, fontFamily: font.text, fontSize: 14, color: sky.dim },
});
