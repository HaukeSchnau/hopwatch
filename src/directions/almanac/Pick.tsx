// The picker slip: every startable context in index order. Used to fill a gap
// ("What was this?") and to file an entry under a different context.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  type ContextId,
  type EntryId,
  formatClock,
  formatDuration,
  formatRelativeDay,
  HOUR,
  MINUTE,
  type ResolvedContext,
  useEntry,
  useNow,
  usePickableContexts,
} from '@/core';

import { RisoDot } from './Riso';
import { font, ink, margin, paper, riso } from './theme';
import { floorTo5, TimeWheel } from './TimeWheel';
import { Caps, InkLink } from './type';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/almanac');
}

/** "today", "yesterday" or "on Sat 5 Sep". */
function spokenDay(ts: number, now: number) {
  const day = formatRelativeDay(ts, now);
  return day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : `on ${day}`;
}

/** A long gap suggests an hour around the tap rather than the whole stretch. */
function suggestedRange(from: number, to: number, at: number) {
  if (to - from <= 3 * HOUR) return { from, to };
  const start = Math.max(from, Math.min(floorTo5(at - 30 * MINUTE), to - HOUR));
  return { from: start, to: Math.min(to, start + HOUR) };
}

export function GapPick({ from, to, at }: { from: number; to: number; at: number }) {
  const [range, setRange] = useState(() => suggestedRange(from, to, at));
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const now = useNow(30_000);
  const length = range.to - range.from;
  const whole = range.from === from && range.to === to;

  const header = (
    <View>
      <Caps color={ink.red}>What was this?</Caps>
      <Text style={styles.title}>
        {formatDuration(length)} <Text style={styles.titleSoft}>untracked, {spokenDay(range.from, now)}</Text>
      </Text>
      <View style={styles.rangeRow}>
        <RangeButton label="from" value={range.from} active={editing === 'from'} onPress={() => setEditing(editing === 'from' ? null : 'from')} />
        <Text style={styles.rangeDash}>–</Text>
        <RangeButton label="to" value={range.to} active={editing === 'to'} onPress={() => setEditing(editing === 'to' ? null : 'to')} />
        {!whole && (
          <InkLink
            textStyle={styles.wholeLink}
            color={ink.soft}
            onPress={() => {
              setRange({ from, to });
              setEditing(null);
            }}>
            whole gap
          </InkLink>
        )}
      </View>
      {editing && (
        <View style={styles.wheel}>
          <TimeWheel
            key={editing}
            value={editing === 'from' ? range.from : range.to}
            min={editing === 'from' ? from : range.from + MINUTE}
            max={editing === 'from' ? range.to - MINUTE : to}
            withDate={false}
            height={150}
            onChange={(ts) => setRange((r) => (editing === 'from' ? { ...r, from: ts } : { ...r, to: ts }))}
          />
        </View>
      )}
      <Text style={styles.hint}>File it under:</Text>
    </View>
  );

  return (
    <ContextList
      header={header}
      onPick={(context) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        actions.fillGap(context.id, range.from, range.to);
        close();
      }}
    />
  );
}

function RangeButton({ label, value, active, onPress }: { label: string; value: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change ${label} time, ${formatClock(value)}`}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.range, active && styles.rangeActive]}>
      <Text style={[styles.rangeText, active && { color: paper.sheet }]}>{formatClock(value)}</Text>
    </Pressable>
  );
}

export function EntryPick({ entryId }: { entryId: EntryId }) {
  const entry = useEntry(entryId);
  const header = (
    <View>
      <Caps>Refile</Caps>
      <Text style={styles.title}>File this entry under…</Text>
      {entry && (
        <Text style={styles.hint}>
          {formatClock(entry.startUtc)}–{entry.endUtc ? formatClock(entry.endUtc) : 'now'}
        </Text>
      )}
    </View>
  );
  return (
    <ContextList
      header={header}
      current={entry?.contextId ?? null}
      onPick={(context) => {
        Haptics.selectionAsync();
        actions.updateEntry(entryId, { contextId: context.id }, `Refiled under ${context.name}`);
        close();
      }}
    />
  );
}

/** The index as a picking list: indented by depth, each row a big tap target. */
function ContextList({
  header,
  onPick,
  current = null,
}: {
  header: ReactNode;
  onPick: (context: ResolvedContext) => void;
  current?: ContextId | null;
}) {
  const insets = useSafeAreaInsets();
  const contexts = usePickableContexts();
  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: margin, paddingTop: 26, paddingBottom: insets.bottom + 30 }}
      keyboardShouldPersistTaps="handled">
      {header}
      <View style={styles.list}>
        {contexts.map((context) => (
          <Pressable
            key={context.id}
            accessibilityRole="button"
            accessibilityState={{ selected: context.id === current }}
            onPress={() => onPick(context)}
            style={({ pressed }) => [styles.row, { paddingLeft: context.depth * 18 }, pressed && styles.rowPressed]}>
            <RisoDot hue={context.hue} size={9} />
            <Text style={[styles.rowName, context.depth === 0 && styles.rowRoot]} numberOfLines={1}>
              {context.glyph ? `${context.glyph} ` : ''}
              {context.name}
            </Text>
            {context.id === current && <Caps color={riso[context.hue].type}>Filed here</Caps>}
          </Pressable>
        ))}
        {contexts.length === 0 && <Text style={styles.hint}>The index is empty.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 4, fontFamily: font.display, fontSize: 36, lineHeight: 40, color: ink.full, letterSpacing: -0.4 },
  titleSoft: { fontFamily: font.displayItalic, color: ink.soft, fontSize: 28 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  range: { minHeight: 44, minWidth: 84, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: ink.full },
  rangeActive: { backgroundColor: ink.full },
  rangeText: { fontFamily: font.sansBold, fontSize: 17, color: ink.full, fontVariant: ['tabular-nums'] },
  rangeDash: { fontFamily: font.display, fontSize: 26, color: ink.soft },
  wholeLink: { fontFamily: font.textItalic, fontSize: 16, marginLeft: 8 },
  wheel: { marginHorizontal: -margin },
  hint: { marginTop: 14, fontFamily: font.textItalic, fontSize: 16, color: ink.soft },
  list: { marginTop: 8, borderTopWidth: 1, borderTopColor: ink.full },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ink.rule,
  },
  rowPressed: { backgroundColor: 'rgba(28,26,23,0.06)' },
  rowName: { flex: 1, fontFamily: font.display, fontSize: 22, color: ink.full },
  rowRoot: { fontSize: 24 },
});
