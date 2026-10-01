// Stuff: every context as a nested list of candy chips. Tap a jelly to start it, hold
// it for a native context menu (edit, add inside, pin, move, archive, delete), or tap
// the pencil to open its editor. Archived jellies hide behind a toggle.

import { MenuView } from '@expo/ui/community/menu';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, formatDuration, MINUTE, type ResolvedContext, useRunning, useTree } from '@/core';

import { buzz, play } from '../feedback';
import { alpha, candy, colors, fonts, TAB_BAR_HEIGHT } from '../theme';
import { CandySurface, JellyButton, JellySwitch, Squishy } from '../ui';

export function StuffScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tree = useTree();
  const running = useRunning();
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = tree.ordered.filter((c) => c.archivedAt !== null).length;
  const visible = tree.ordered.filter((c) => showArchived || !c.hidden);
  const live = tree.ordered.filter((c) => !c.hidden).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Your jellies</Text>
          <Text style={styles.subtitle}>
            {live} {live === 1 ? 'jelly' : 'jellies'} · tap to start, hold for more
          </Text>
        </View>
        <JellyButton label="New" icon="plus" size="small" onPress={() => router.push('/jelly1/context')} />
      </View>

      <View style={styles.list}>
        {visible.map((c, i) => (
          <Row key={c.id} context={c} running={running?.context.id === c.id} last={i === visible.length - 1} width={width - 44} />
        ))}
      </View>

      {archivedCount > 0 && (
        <View style={styles.archivedToggle}>
          <Text style={styles.archivedText}>Show archived ({archivedCount})</Text>
          <JellySwitch value={showArchived} onValueChange={setShowArchived} accessibilityLabel="Show archived" />
        </View>
      )}
    </ScrollView>
  );
}

/** One jelly. The native context menu hosts the row and sizes to it, hence the explicit width. */
function Row({ context, running, last, width }: { context: ResolvedContext; running: boolean; last: boolean; width: number }) {
  const c = candy[context.hue];
  const pinned = context.pinPosition !== null;
  const archived = context.archivedAt !== null;
  const meta = [
    running && 'running',
    pinned && 'pinned',
    context.weeklyTargetMinutes !== null && `${Math.round(context.weeklyTargetMinutes / 60)} h/week`,
    context.nudgeAfterMinutes !== null && `nudge ${formatDuration(context.nudgeAfterMinutes * MINUTE)}`,
    archived && 'archived',
  ].filter(Boolean);

  const edit = () => router.push({ pathname: '/jelly1/context', params: { id: context.id } });
  const onMenu = (action: string) => {
    switch (action) {
      case 'edit':
        return edit();
      case 'child':
        return router.push({ pathname: '/jelly1/context', params: { parent: context.id } });
      case 'pin':
        return pinned ? actions.unpin(context.id) : actions.pin(context.id);
      case 'move':
        return router.push({ pathname: '/jelly1/pick', params: { mode: 'parent', id: context.id } });
      case 'archive':
        return archived ? actions.unarchive(context.id) : actions.archive(context.id);
      case 'delete':
        return confirmDelete(context);
    }
  };

  return (
    <MenuView
      shouldOpenOnLongPress
      title={context.name}
      onPressAction={(e) => onMenu(e.nativeEvent.event)}
      actions={[
        { id: 'edit', title: 'Edit', image: 'pencil' },
        { id: 'child', title: 'Add inside', image: 'plus' },
        { id: 'pin', title: pinned ? 'Unpin' : 'Pin to Now', image: pinned ? 'pin.slash' : 'pin' },
        { id: 'move', title: 'Move…', image: 'arrow.turn.down.right' },
        { id: 'archive', title: archived ? 'Unarchive' : 'Archive', image: 'archivebox' },
        { id: 'delete', title: 'Delete', image: 'trash', attributes: { destructive: true } },
      ]}>
      <View style={[styles.row, { width }, !last && styles.rowDivider]}>
        {context.depth > 0 && <Guides depth={context.depth} />}
        <Pressable
          style={styles.rowMain}
          disabled={context.hidden}
          onPress={() => {
            if (running) return;
            buzz.thud();
            play('pop');
            actions.start(context.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Start ${context.name}`}
          accessibilityHint="Hold for more options">
          {({ pressed }) => (
            <>
              <View style={{ transform: [{ scale: pressed ? 0.88 : 1 }] }}>
                <CandySurface hue={context.hue} radius={19} flat style={[styles.chip, context.hidden && { opacity: 0.45 }]}>
                  <Text style={styles.chipEmoji}>{context.glyph ?? ''}</Text>
                </CandySurface>
                {running && <View style={[styles.liveDot, { backgroundColor: c.fill, borderColor: colors.card }]} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, context.hidden && { color: colors.muted }]} numberOfLines={1}>
                  {context.name}
                </Text>
                {meta.length > 0 && (
                  <Text style={[styles.meta, running && { color: c.deep }]} numberOfLines={1}>
                    {meta.join(' · ')}
                  </Text>
                )}
              </View>
            </>
          )}
        </Pressable>
        <Squishy onPress={edit} accessibilityRole="button" accessibilityLabel={`Edit ${context.name}`} hitSlop={4}>
          <View style={styles.edit}>
            <SymbolView name="pencil" size={15} tintColor={colors.muted} weight="bold" />
          </View>
        </Squishy>
      </View>
    </MenuView>
  );
}

/** Candy-stick guides showing how deep a jelly sits. */
function Guides({ depth }: { depth: number }) {
  return (
    <View style={[styles.guides, { width: depth * 20 }]}>
      {Array.from({ length: depth }, (_, i) => (
        <View key={i} style={styles.guide} />
      ))}
    </View>
  );
}

export function confirmDelete(context: ResolvedContext, after?: () => void) {
  Alert.alert(`Delete ${context.name}?`, 'Jellies with history or children are archived instead, so reports keep their time.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        const result = actions.deleteContext(context.id);
        buzz.thud();
        if (result === 'archived') Alert.alert('Archived instead', `${context.name} has history, so it was archived. Find it under "Show archived".`);
        after?.();
      },
    },
  ]);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, marginBottom: 14, gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.ink, letterSpacing: -0.4 },
  subtitle: { fontFamily: fonts.textBold, fontSize: 14, color: colors.muted, marginTop: -2 },
  list: { backgroundColor: colors.card, borderRadius: 28, marginHorizontal: 16, paddingHorizontal: 6, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingLeft: 8, paddingRight: 4 },
  rowDivider: { borderBottomWidth: 1.5, borderBottomColor: alpha(colors.ink, 0.05) },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  guides: { flexDirection: 'row', alignSelf: 'stretch' },
  guide: { width: 20, borderLeftWidth: 2.5, borderLeftColor: alpha(colors.ink, 0.07), marginLeft: 8, borderRadius: 2 },
  chip: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  chipEmoji: { fontSize: 19 },
  liveDot: { position: 'absolute', right: -2, top: -2, width: 13, height: 13, borderRadius: 7, borderWidth: 2.5 },
  name: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  meta: { fontFamily: fonts.textBold, fontSize: 12.5, color: colors.muted, marginTop: 0 },
  edit: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunken, alignItems: 'center', justifyContent: 'center' },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 18,
    height: 56,
    borderRadius: 22,
    backgroundColor: colors.card,
  },
  archivedText: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
});
