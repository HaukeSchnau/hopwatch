// The Index: every context, set like the index at the back of a book. Indented by
// depth, dotted leaders, and this week's totals where the page numbers would be.
// Tap starts the clock, hold for the rest, "Edit" turns taps into editing.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  formatDuration,
  type ResolvedContext,
  startOfWeek,
  useNow,
  useRunning,
  useTree,
  useWeekReport,
} from '@/core';

import { startEarlier, switchTo } from './commands';
import { InkCircle, seedOf } from './InkCircle';
import { PageHeader } from './PageHeader';
import { Paper } from './Paper';
import { RisoDot } from './Riso';
import { font, ink, margin, riso } from './theme';
import { Caps, InkLink, Leader, Rule } from './type';

export function IndexPage() {
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const now = useNow(60_000);
  const week = useWeekReport(startOfWeek(now));
  const running = useRunning();
  const [editing, setEditing] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = tree.ordered.filter((c) => c.archivedAt !== null).length;
  const rows = tree.ordered.filter((c) => showArchived || !c.hidden);

  const edit = (context: ResolvedContext) => router.push(`/almanac/context/${context.id}`);

  const more = (context: ResolvedContext) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const options = [
      ...(context.hidden ? [] : ['Start earlier…']),
      'Edit…',
      'Add a sub-entry…',
      ...(context.hidden ? [] : [context.pinPosition === null ? 'Pin to the front page' : 'Unpin']),
      context.archivedAt === null ? 'Archive' : 'Unarchive',
      'Cancel',
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: context.name,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: options.indexOf('Archive'),
      },
      (index) => {
        switch (options[index]) {
          case 'Start earlier…':
            return startEarlier(context.id);
          case 'Edit…':
            return edit(context);
          case 'Add a sub-entry…':
            return router.push({ pathname: '/almanac/context/new', params: { parent: context.id } });
          case 'Pin to the front page':
            return actions.pin(context.id);
          case 'Unpin':
            return actions.unpin(context.id);
          case 'Archive':
            return actions.archive(context.id);
          case 'Unarchive':
            return actions.unarchive(context.id);
        }
      },
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 100, paddingHorizontal: margin }}>
        <PageHeader
          title="Index"
          folio="p. 4"
          right={
            <InkLink
              onPress={() => setEditing(!editing)}
              textStyle={styles.editLink}
              style={styles.editWrap}
              accessibilityLabel={editing ? 'Done editing' : 'Edit the index'}>
              {editing ? 'Done' : 'Edit'}
            </InkLink>
          }
        />
        <Text style={styles.note}>
          {editing ? 'Tap an entry to edit it: name, ink, target, nudge, link.' : 'Tap an entry to start the clock on it. Hold one for more.'}
        </Text>
        <View style={styles.colHead}>
          <Caps color={ink.full}>Contexts</Caps>
          <Caps>This week</Caps>
        </View>
        <Rule weight="regular" />

        {rows.map((context) => (
          <IndexRow
            key={context.id}
            context={context}
            total={week.totals.byId.get(context.id)?.total ?? 0}
            runningEntryId={running?.context.id === context.id ? running.entry.id : null}
            editing={editing}
            onPress={() => {
              if (editing || context.hidden) return edit(context);
              switchTo(context.id);
            }}
            onLongPress={() => more(context)}
          />
        ))}
        {rows.length === 0 && <Text style={styles.empty}>The index is empty. Add the first entry below.</Text>}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Haptics.selectionAsync();
            router.push('/almanac/context/new');
          }}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.6 }]}>
          <Text style={styles.addText}>+ Add to the index</Text>
        </Pressable>

        {archivedCount > 0 && (
          <InkLink
            color={ink.soft}
            textStyle={styles.archivedLink}
            style={{ alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' }}
            onPress={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Hide the archived' : `Show ${archivedCount} archived ‡`}
          </InkLink>
        )}

        <View style={styles.footnotes}>
          <Text style={styles.footnote}>† pinned to the front page</Text>
          <Text style={styles.footnote}>‡ archived: kept in the record, gone from the pickers</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function IndexRow({
  context,
  total,
  runningEntryId,
  editing,
  onPress,
  onLongPress,
}: {
  context: ResolvedContext;
  total: number;
  runningEntryId: string | null;
  editing: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const root = context.depth === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${context.name}${editing ? ', edit' : ', start'}`}
      accessibilityHint="Hold for more options"
      onPress={() => {
        if (editing) Haptics.selectionAsync();
        onPress();
      }}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => [styles.row, root && styles.rowRoot, pressed && styles.rowPressed]}>
      <View style={[styles.rowInner, { paddingLeft: context.depth * 20 }]}>
        <RisoDot hue={context.hue} size={root ? 10 : 8} style={{ marginRight: 10, opacity: context.hidden ? 0.4 : 1 }} />
        <View
          style={{ flexShrink: 1 }}
          onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          <Text
            numberOfLines={1}
            style={[styles.name, root ? styles.nameRoot : styles.nameChild, context.hidden && { color: ink.faint }]}>
            {context.glyph ? `${context.glyph} ` : ''}
            {context.name}
            {context.pinPosition !== null && <Text style={styles.mark}> †</Text>}
            {context.archivedAt !== null && <Text style={styles.mark}> ‡</Text>}
          </Text>
          {runningEntryId && box && (
            <View style={styles.circle} pointerEvents="none">
              <InkCircle
                key={runningEntryId}
                seed={seedOf(runningEntryId)}
                width={box.width + 22}
                height={box.height + 14}
                color={riso[context.hue].type}
              />
            </View>
          )}
        </View>
        <Leader />
        <Text style={[styles.figure, total === 0 && { color: ink.faint }]}>{total > 0 ? formatDuration(total) : '–'}</Text>
        {editing && <Text style={styles.chevron}>›</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  editWrap: { minHeight: 44, justifyContent: 'center', marginBottom: 6 },
  editLink: { fontSize: 22 },
  note: { marginTop: 12, fontFamily: font.textItalic, fontSize: 16, lineHeight: 22, color: ink.soft },
  colHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  row: { minHeight: 48, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.rule },
  rowRoot: { minHeight: 54 },
  rowPressed: { backgroundColor: 'rgba(28,26,23,0.06)' },
  rowInner: { flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: font.display, color: ink.full },
  nameRoot: { fontSize: 25 },
  nameChild: { fontSize: 21 },
  mark: { fontFamily: font.text, fontSize: 15, color: ink.soft },
  circle: { position: 'absolute', left: -11, top: -7 },
  figure: { fontFamily: font.sans, fontSize: 13.5, color: ink.full, fontVariant: ['tabular-nums'] },
  chevron: { marginLeft: 8, fontFamily: font.display, fontSize: 24, color: ink.soft },
  empty: { marginTop: 16, fontFamily: font.textItalic, fontSize: 17, color: ink.soft },
  add: { marginTop: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: ink.full, borderStyle: 'dashed' },
  addText: { fontFamily: font.displayItalic, fontSize: 23, color: ink.full },
  archivedLink: { fontFamily: font.textItalic, fontSize: 16 },
  footnotes: { marginTop: 24, gap: 2 },
  footnote: { fontFamily: font.textItalic, fontSize: 13.5, color: ink.faint },
});
