import { MenuView } from '@expo/ui/community/menu';
import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { pathLabel, type ResolvedContext, usePickableContexts, useRunning } from '@/core';

import { onStartMenu, startMenu } from './backdate';
import { Glyph } from './Glyph';
import { useTheme } from './theme';

/** Contexts matching a search, in tree order. Matches show their full path. */
export function useFilteredContexts(query: string): ResolvedContext[] {
  const contexts = usePickableContexts();
  const q = query.trim().toLowerCase();
  if (!q) return contexts;
  return contexts.filter((c) => pathLabel(c).toLowerCase().includes(q));
}

/** A search field in the style of UISearchBar. */
export function SearchField({ value, onChange, autoFocus }: { value: string; onChange: (text: string) => void; autoFocus?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.fill }]}>
      <SymbolView name="magnifyingglass" size={17} tintColor={theme.secondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search"
        placeholderTextColor={theme.secondary}
        style={[styles.searchInput, { color: theme.label }]}
        autoCorrect={false}
        autoFocus={autoFocus}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
    </View>
  );
}

interface ContextRowsProps {
  contexts: ResolvedContext[];
  /** Flat list with paths (search results) instead of an indented tree. */
  flat: boolean;
  onPick: (context: ResolvedContext) => void;
  /** Long-press offers backdated starts. */
  withMenu?: boolean;
  trailing?: (context: ResolvedContext) => ReactNode;
}

/** Picker rows: emoji badge, name, and either indentation or the path. */
export function ContextRows({ contexts, flat, onPick, withMenu, trailing }: ContextRowsProps) {
  const theme = useTheme();
  const running = useRunning();
  // The native menu host sizes to its content, so rows get an explicit width.
  const { width } = useWindowDimensions();
  return (
    <View>
      {contexts.map((context, index) => {
        const row = (
          <Pressable
            accessibilityRole="button"
            onPress={() => onPick(context)}
            style={({ pressed }) => [styles.row, { width, paddingLeft: 16 + (flat ? 0 : Math.min(context.depth, 4) * 22) }, pressed && { backgroundColor: theme.fill }]}>
            <Badge context={context} />
            <View style={[styles.rowText, index > 0 && { borderTopColor: theme.separator, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.rowTitles}>
                <Text style={[styles.name, { color: theme.label }]} numberOfLines={1}>
                  {context.name}
                </Text>
                {flat && context.depth > 0 ? (
                  <Text style={[styles.path, { color: theme.secondary }]} numberOfLines={1}>
                    {context.ancestors.map((a) => a.name).join(' › ')}
                  </Text>
                ) : null}
              </View>
              {running?.context.id === context.id ? (
                <SymbolView name="waveform" size={17} tintColor={theme.hue(context.hue).ink} animationSpec={{ effect: { type: 'pulse' }, repeating: true }} />
              ) : null}
              {trailing?.(context)}
            </View>
          </Pressable>
        );
        return withMenu ? (
          <MenuView
            key={context.id}
            shouldOpenOnLongPress
            title={context.name}
            actions={startMenu()}
            onPressAction={({ nativeEvent }) => onStartMenu(context.id, nativeEvent.event)}>
            {row}
          </MenuView>
        ) : (
          <View key={context.id}>{row}</View>
        );
      })}
    </View>
  );
}

/** The context's emoji on a soft disc of its color. */
export function Badge({ context, size = 34 }: { context: ResolvedContext; size?: number }) {
  const theme = useTheme();
  const hue = theme.hue(context.hue);
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: hue.soft }]}>
      <Glyph context={context} size={size * 0.52} />
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 17, height: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  rowText: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 10, paddingRight: 16 },
  rowTitles: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
  name: { fontSize: 17, letterSpacing: -0.4 },
  path: { fontSize: 13, marginTop: 1 },
  badge: { alignItems: 'center', justifyContent: 'center' },
});
