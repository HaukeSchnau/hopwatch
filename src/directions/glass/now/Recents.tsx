import { MenuView } from '@expo/ui/community/menu';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import Animated, { LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { actions, type ResolvedContext, useRecents } from '@/core';

import { onStartMenu, startMenu } from '../backdate';
import { Glass } from '../Glass';
import { Glyph } from '../Glyph';
import { useTheme } from '../theme';
import { SIDE } from './TileGrid';

/**
 * A row of glass capsules: "All contexts" first, so the full tree is always one tap
 * away, then recently used contexts that aren't pinned.
 */
export function Recents() {
  const recents = useRecents(8);
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/glass/pick');
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <Glass interactive style={styles.capsule}>
          <SymbolView name="magnifyingglass" size={15} weight="semibold" tintColor={theme.label} />
          <Text style={[styles.label, { color: theme.label }]}>All contexts</Text>
        </Glass>
      </Pressable>
      {recents.map((context) => (
        <Animated.View key={context.id} entering={ZoomIn.springify().damping(16)} exiting={ZoomOut.duration(160)} layout={LinearTransition.springify().damping(18)}>
          <RecentCapsule context={context} />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

function RecentCapsule({ context }: { context: ResolvedContext }) {
  const theme = useTheme();
  const hue = theme.hue(context.hue);
  return (
    <MenuView
      shouldOpenOnLongPress
      title={context.name}
      actions={startMenu()}
      onPressAction={({ nativeEvent }) => onStartMenu(context.id, nativeEvent.event)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={context.name}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.start(context.id);
        }}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <Glass interactive tint={hue.soft} style={styles.capsule}>
          <Glyph context={context} size={17} />
          <Text style={[styles.label, { color: theme.label }]} numberOfLines={1}>
            {context.name}
          </Text>
        </Glass>
      </Pressable>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  scroller: { flexGrow: 0, overflow: 'visible' },
  row: { paddingHorizontal: SIDE, gap: 8, alignItems: 'center' },
  capsule: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: 220,
  },
  label: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
});
