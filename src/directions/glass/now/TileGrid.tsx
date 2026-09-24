import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { usePinned, useRunning } from '@/core';

import { useTheme } from '../theme';
import { Tile } from './Tile';

const COLUMNS = 4;
const GAP = 12;
export const SIDE = 16;

/**
 * The pinned grid. Slots keep their holes, so a tile never moves when another is
 * unpinned: muscle memory and color find it.
 */
export function TileGrid() {
  const { slots } = usePinned();
  const running = useRunning();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  if (slots.length === 0) {
    return (
      <Pressable onPress={() => router.navigate('/glass/contexts')} style={styles.empty}>
        <Text style={[styles.emptyText, { color: theme.secondary }]}>
          Pin the contexts you switch to most. They keep their place here, so your thumb learns where they are.
        </Text>
        <Text style={[styles.emptyLink, { color: theme.accent }]}>Open Contexts</Text>
      </Pressable>
    );
  }

  const rows: (typeof slots)[] = [];
  for (let i = 0; i < slots.length; i += COLUMNS) rows.push(slots.slice(i, i + COLUMNS));

  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((context, c) =>
            context ? (
              <Tile
                key={context.id}
                context={context}
                size={size}
                runningSince={running?.context.id === context.id ? running.entry.startUtc : null}
              />
            ) : (
              <View key={`hole-${r}-${c}`} style={{ width: size, height: size }} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: SIDE, gap: GAP },
  row: { flexDirection: 'row', gap: GAP },
  empty: { marginHorizontal: SIDE, paddingVertical: 8, gap: 6 },
  emptyText: { fontSize: 15, lineHeight: 20 },
  emptyLink: { fontSize: 15, fontWeight: '600' },
});
