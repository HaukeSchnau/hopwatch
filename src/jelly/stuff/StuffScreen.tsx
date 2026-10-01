// Stuff: every jelly in a native list under a large title, with search, the settings gear
// and "+" in the header. Tap a jelly to start it, ⓘ to edit it, swipe to pin, archive or
// edit, hold for the native menu (backdated starts, add inside, move, delete). Archived
// jellies hide behind a switch.

import { router, Stack } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { actions, formatDuration, MINUTE, pathLabel, type ResolvedContext, useNow, useRunning, useTree } from '@/core';

import { Character } from '../Character';
import { buzz, play } from '../feedback';
import { Menu } from '../Menu';
import { onStartMenu, useStartMenu } from '../menus';
import { alpha, text, useTheme } from '../theme';

const edit = (id: string) => router.push({ pathname: '/context', params: { id } });

export function StuffScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const tree = useTree();
  const running = useRunning();
  const now = useNow(60_000);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const archivedCount = tree.ordered.filter((c) => c.archivedAt !== null).length;
  const q = query.trim().toLowerCase();
  const visible = tree.ordered.filter((c) => (showArchived || !c.hidden) && (!q || pathLabel(c).toLowerCase().includes(q)));
  const live = tree.ordered.filter((c) => !c.hidden).length;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: t.c.bg }} contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
      <Stack.Title large largeStyle={{ color: t.c.ink }} style={{ color: t.c.ink }}>
        Stuff
      </Stack.Title>
      <Stack.SearchBar placement="stacked" hideWhenScrolling={false} placeholder="Find a jelly" onChangeText={(e) => setQuery(e.nativeEvent.text)} onCancelButtonPress={() => setQuery('')} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="gearshape" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" accessibilityLabel="New jelly" onPress={() => router.push('/context')} />
      </Stack.Toolbar>

      <Text style={[text.footnote, styles.caption, { color: t.c.muted }]}>
        {q ? `${visible.length} ${visible.length === 1 ? 'match' : 'matches'}` : `${live} ${live === 1 ? 'jelly' : 'jellies'} · tap to start, hold or swipe for more`}
      </Text>
      <View style={[styles.card, { backgroundColor: t.c.card }]}>
        {visible.map((c, i) => (
          <Row
            key={c.id}
            context={c}
            running={running?.context.id === c.id}
            last={i === visible.length - 1}
            width={width - 32}
            now={now}
            flat={q.length > 0}
          />
        ))}
        {visible.length === 0 && <Text style={[text.body, styles.none, { color: t.c.muted }]}>{`No jelly matches “${query}”.`}</Text>}
      </View>

      {archivedCount > 0 && !q && (
        <View style={[styles.card, styles.archived, { backgroundColor: t.c.card }]}>
          <Text style={[text.body, { color: t.c.ink }]}>Show archived ({archivedCount})</Text>
          <Switch value={showArchived} onValueChange={setShowArchived} trackColor={{ true: t.c.pink }} accessibilityLabel="Show archived" />
        </View>
      )}
    </ScrollView>
  );
}

interface RowProps {
  context: ResolvedContext;
  running: boolean;
  last: boolean;
  width: number;
  now: number;
  /** Search results: no indentation, full paths. */
  flat: boolean;
}

/** One jelly. The native context menu hosts the row and sizes to it, hence the explicit width. */
function Row({ context, running, last, width, now, flat }: RowProps) {
  const t = useTheme();
  const c = t.candy[context.hue];
  const pinned = context.pinPosition !== null;
  const archived = context.archivedAt !== null;
  const meta = [
    running && 'running',
    pinned && 'pinned',
    context.weeklyTargetMinutes !== null && `${formatDuration(context.weeklyTargetMinutes * MINUTE)} a week`,
    context.nudgeAfterMinutes !== null && `nudge after ${formatDuration(context.nudgeAfterMinutes * MINUTE)}`,
    archived && 'archived',
  ].filter(Boolean);
  const depth = flat ? 0 : context.depth;
  const startItems = useStartMenu(context, now, running);

  const onMenu = (event: string) => {
    if (event === 'child') return router.push({ pathname: '/context', params: { parent: context.id } });
    if (event === 'pin') return pinned ? actions.unpin(context.id) : actions.pin(context.id);
    if (event === 'move') return router.push({ pathname: '/pick', params: { mode: 'parent', id: context.id } });
    if (event === 'archive') return archived ? actions.unarchive(context.id) : actions.archive(context.id);
    if (event === 'delete') return confirmDelete(context);
    onStartMenu(context.id, event);
  };

  const start = () => {
    if (context.hidden) return edit(context.id);
    if (running) return buzz.tap();
    buzz.thud();
    play('pop');
    actions.start(context.id);
  };

  return (
    <Swipeable
      friction={1.6}
      overshootLeft={false}
      overshootRight={false}
      childrenContainerStyle={{ backgroundColor: t.c.card }}
      containerStyle={styles.swipe}
      renderLeftActions={(_p, _x, swipe) =>
        context.hidden ? null : (
          <SwipeAction icon={pinned ? 'pin.slash.fill' : 'pin.fill'} label={pinned ? 'Unpin' : 'Pin'} color={t.candy.orange.fill} swipe={swipe} onPress={() => onMenu('pin')} />
        )
      }
      renderRightActions={(_p, _x, swipe) => (
        <View style={styles.actions}>
          <SwipeAction icon="pencil" label="Edit" color={t.candy.gray.fill} swipe={swipe} onPress={() => edit(context.id)} />
          <SwipeAction
            icon={archived ? 'tray.and.arrow.up.fill' : 'archivebox.fill'}
            label={archived ? 'Unarchive' : 'Archive'}
            color={t.candy.indigo.fill}
            swipe={swipe}
            onPress={() => onMenu('archive')}
          />
        </View>
      )}>
      <Menu
        title={pathLabel(context)}
        onPress={onMenu}
        items={[
          ...(context.hidden ? [{ id: 'edit', title: `Edit ${context.name}`, image: 'pencil' as const }] : startItems),
          { id: 'child', title: 'Add inside', image: 'plus' },
          ...(context.hidden ? [] : [{ id: 'pin', title: pinned ? 'Unpin from Now' : 'Pin to Now', image: pinned ? ('pin.slash' as const) : ('pin' as const) }]),
          { id: 'move', title: 'Move…', image: 'arrow.turn.down.right' },
          { id: 'archive', title: archived ? 'Unarchive' : 'Archive', image: archived ? 'tray.and.arrow.up' : 'archivebox' },
          { id: 'delete', title: 'Delete', image: 'trash', destructive: true },
        ]}>
        <View style={[styles.row, { width }]}>
          {depth > 0 && <Guides depth={depth} color={alpha(t.c.ink, 0.08)} />}
          <Pressable
            style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}
            onPress={start}
            accessibilityRole="button"
            accessibilityLabel={context.hidden ? `Edit ${context.name}` : `Start ${context.name}`}
            accessibilityHint="Hold for more options">
            <Character context={context} size={46} mood={running ? 'awake' : 'asleep'} shadow={false} dim={context.hidden} style={styles.jelly} />
            <View style={styles.titles}>
              <Text style={[text.body, { color: context.hidden ? t.c.muted : t.c.ink }]} numberOfLines={1}>
                {flat ? pathLabel(context) : context.name}
              </Text>
              {meta.length > 0 && (
                <Text style={[text.footnote, { color: running ? c.ink : t.c.muted }]} numberOfLines={1}>
                  {meta.join(' · ')}
                </Text>
              )}
            </View>
          </Pressable>
          <Pressable onPress={() => edit(context.id)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Edit ${context.name}`} style={styles.info}>
            <SymbolView name="info.circle" size={21} tintColor={t.c.pinkDeep} />
          </Pressable>
          {!last && <View style={[styles.separator, { left: 16 + depth * 18 + 64, backgroundColor: t.c.line }]} />}
        </View>
      </Menu>
    </Swipeable>
  );
}

function SwipeAction({
  icon,
  label,
  color,
  swipe,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  color: string;
  swipe: SwipeableMethods;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        buzz.tap();
        swipe.close();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.swipeAction, { backgroundColor: color }]}>
      <SymbolView name={icon} size={18} tintColor="#FFFFFF" weight="semibold" />
      <Text style={[text.caption, styles.swipeLabel]}>{label}</Text>
    </Pressable>
  );
}

/** Thin guides showing how deep a jelly sits. */
function Guides({ depth, color }: { depth: number; color: string }) {
  return (
    <View style={[styles.guides, { width: depth * 18 }]}>
      {Array.from({ length: depth }, (_, i) => (
        <View key={i} style={[styles.guide, { borderLeftColor: color }]} />
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
  content: { paddingBottom: 40 },
  caption: { marginHorizontal: 20, marginTop: 4, marginBottom: 8 },
  card: { marginHorizontal: 16, borderRadius: 24, overflow: 'hidden' },
  swipe: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 62, paddingLeft: 12, paddingRight: 4 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  titles: { flex: 1 },
  // Room for the emoji sticker, which hangs out of a small jelly's box.
  jelly: { marginRight: 6 },
  info: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  separator: { position: 'absolute', right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  guides: { flexDirection: 'row', alignSelf: 'stretch' },
  guide: { width: 18, borderLeftWidth: 2, marginLeft: 8 },
  actions: { flexDirection: 'row' },
  swipeAction: { width: 78, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeLabel: { color: '#FFFFFF' },
  none: { padding: 20, textAlign: 'center' },
  archived: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 18, height: 56 },
});
