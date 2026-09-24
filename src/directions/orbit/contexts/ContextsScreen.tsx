import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type ContextId, formatDuration, MINUTE, type ResolvedContext, useRunning, useTree } from '@/core';

import { Guides } from '../ContextPicker';
import { useTabBarClearance } from '../TabBar';
import { alpha, font, neon, sky } from '../theme';
import { IconButton, Label, Moon } from '../ui';

const editContext = (id: ContextId | 'new', parent?: ContextId) =>
  router.push({ pathname: '/orbit/context/[id]', params: parent ? { id, parent } : { id } });

/**
 * The whole tree, like a star chart: glowing dots, indentation guides. Tapping a
 * context starts it; the slider button (or a long-press) opens its settings.
 */
export function ContextsScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const tree = useTree();
  const running = useRunning();
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = tree.ordered.filter((c) => c.archivedAt !== null).length;
  const rows = tree.ordered.filter((c) => showArchived || !c.hidden);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: clearance }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Contexts</Text>
          <Label>
            {tree.ordered.length - archivedCount} active · tap to start
          </Label>
        </View>
        <IconButton
          name="plus"
          size={20}
          color={sky.bg}
          accessibilityLabel="New context"
          onPress={() => editContext('new')}
          style={styles.add}
        />
      </View>

      <View style={styles.list}>
        {rows.map((context) => (
          <ContextRow key={context.id} context={context} running={context.id === running?.context.id} />
        ))}
      </View>

      {archivedCount > 0 && (
        <Pressable onPress={() => setShowArchived((v) => !v)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: showArchived }}>
          <SymbolView name={showArchived ? 'archivebox.fill' : 'archivebox'} size={15} tintColor={sky.dim} />
          <Text style={styles.toggleText}>
            {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function ContextRow({ context, running }: { context: ResolvedContext; running: boolean }) {
  const color = neon[context.hue];
  const meta = [
    context.pinPosition !== null && 'pinned',
    context.weeklyTargetMinutes !== null && `${formatDuration(context.weeklyTargetMinutes * MINUTE)} / week`,
    context.nudgeAfterMinutes !== null && `nudge ${context.nudgeAfterMinutes} min`,
    context.archivedAt !== null && 'archived',
  ].filter(Boolean);

  // The row and its edit button are siblings, so VoiceOver reaches both.
  return (
    <View
      style={[styles.row, running && { backgroundColor: alpha(color, 0.1) }, context.hidden && { opacity: 0.45 }]}>
      <Pressable
        onPress={() => {
          if (context.hidden) {
            editContext(context.id);
            return;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.start(context.id);
        }}
        onLongPress={() => editContext(context.id)}
        accessibilityRole="button"
        accessibilityLabel={`${context.name}${running ? ', running' : ''}. Tap to start, long-press to edit.`}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}>
        <Guides depth={context.depth} />
        <Moon context={context} size={36} filled={running} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {context.name}
          </Text>
          {(meta.length > 0 || running) && (
            <Text style={[styles.meta, running && { color }]} numberOfLines={1}>
              {running ? ['running', ...meta].join(' · ') : meta.join(' · ')}
            </Text>
          )}
        </View>
      </Pressable>
      <IconButton name="slider.horizontal.3" accessibilityLabel={`Edit ${context.name}`} onPress={() => editContext(context.id)} color={sky.dim} size={17} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, marginBottom: 14 },
  title: { fontFamily: font.display, fontSize: 28, color: sky.text, letterSpacing: -0.8, marginBottom: 4 },
  add: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: sky.accent,
    shadowColor: sky.accent,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  list: { paddingHorizontal: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    paddingLeft: 16,
    paddingRight: 4,
    borderRadius: 18,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  body: { flex: 1 },
  name: { fontFamily: font.textMedium, fontSize: 16.5, color: sky.text, letterSpacing: -0.2 },
  meta: { marginTop: 2, fontFamily: font.mono, fontSize: 10, letterSpacing: 0.8, color: sky.dim, textTransform: 'uppercase' },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, padding: 14 },
  toggleText: { fontFamily: font.textMedium, fontSize: 14, color: sky.dim },
});
