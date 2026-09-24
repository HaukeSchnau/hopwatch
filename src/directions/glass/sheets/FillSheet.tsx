import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  actions,
  formatClock,
  formatDuration,
  HOUR,
  MINUTE,
  type ResolvedContext,
  useEntries,
  useTree,
} from '@/core';

import { Badge, ContextRows, SearchField, useFilteredContexts } from '../ContextList';
import { SheetHeader } from '../SheetHeader';
import { numeric, useTheme } from '../theme';

const QUARTER = 15 * MINUTE;

/** A sensible first guess inside a gap: all of it when short, else an hour around the tap. */
function suggestRange(start: number, end: number, at: number | null) {
  if (end - start <= 3 * HOUR || at === null) return { from: start, to: end };
  const centre = Math.round(at / QUARTER) * QUARTER;
  const from = Math.max(start, centre - HOUR / 2);
  return { from, to: Math.min(end, from + HOUR) };
}

/**
 * "What was this?" for an untracked stretch: adjust the range within the gap, then
 * pick a context. The neighbours on either side are offered first, since forgotten
 * time usually belongs to one of them.
 */
export function FillSheet() {
  const params = useLocalSearchParams<{ start: string; end: string; at?: string }>();
  const gapStart = Number(params.start);
  const gapEnd = Number(params.end);
  const theme = useTheme();
  const [range, setRange] = useState(() => suggestRange(gapStart, gapEnd, params.at ? Number(params.at) : null));
  const [query, setQuery] = useState('');
  const contexts = useFilteredContexts(query);
  const neighbours = useNeighbours(gapStart, gapEnd);

  if (!Number.isFinite(gapStart) || !Number.isFinite(gapEnd)) return null;

  const fill = (context: ResolvedContext) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.fillGap(context.id, range.from, range.to);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <SheetHeader
        title="What Was This?"
        subtitle={`${formatClock(gapStart)}–${formatClock(gapEnd)} · ${formatDuration(gapEnd - gapStart)} untracked`}
      />
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={[styles.range, { backgroundColor: theme.card }]}>
          <TimeField label="From" value={range.from} min={gapStart} max={range.to - MINUTE} onChange={(from) => setRange({ ...range, from })} />
          <View style={[styles.divider, { backgroundColor: theme.separator }]} />
          <TimeField label="To" value={range.to} min={range.from + MINUTE} max={gapEnd} onChange={(to) => setRange({ ...range, to })} />
          <View style={[styles.divider, { backgroundColor: theme.separator }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: theme.label }]}>Duration</Text>
            <Text style={[numeric, styles.duration, { color: theme.secondary }]}>{formatDuration(range.to - range.from)}</Text>
          </View>
        </View>

        {neighbours.length && !query ? (
          <>
            <Text style={[styles.label, { color: theme.secondary }]}>Around it</Text>
            <View style={styles.chips}>
              {neighbours.map((context) => (
                <Pressable key={context.id} onPress={() => fill(context)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                  <View style={[styles.chip, { backgroundColor: theme.hue(context.hue).soft }]}>
                    <Badge context={context} size={28} />
                    <Text style={[styles.chipText, { color: theme.label }]} numberOfLines={1}>
                      {context.name}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={[styles.label, { color: theme.secondary }]}>All contexts</Text>
        <SearchField value={query} onChange={setQuery} />
        <View style={styles.list}>
          <ContextRows contexts={contexts} flat={query.trim().length > 0} onPick={fill} />
        </View>
      </ScrollView>
    </View>
  );
}

/** The contexts of the entries touching the gap, before one first. */
function useNeighbours(start: number, end: number): ResolvedContext[] {
  const entries = useEntries();
  const tree = useTree();
  const before = entries.findLast((e) => e.endUtc !== null && e.endUtc <= start);
  const after = entries.find((e) => e.startUtc >= end);
  const ids = [...new Set([before?.contextId, after?.contextId].filter((id) => id !== undefined))];
  return ids.map((id) => tree.byId.get(id)).filter((c): c is ResolvedContext => c !== undefined && !c.hidden);
}

function TimeField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (ts: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: theme.label }]}>{label}</Text>
      <Host matchContents>
        <DatePicker
          selection={new Date(value)}
          range={{ start: new Date(min), end: new Date(max) }}
          displayedComponents={['hourAndMinute']}
          onDateChange={(date) => onChange(Math.min(max, Math.max(min, date.getTime())))}
          modifiers={[datePickerStyle('compact'), labelsHidden()]}
        />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  range: { borderRadius: 26, paddingHorizontal: 16 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  fieldLabel: { fontSize: 17 },
  duration: { fontSize: 17, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  label: { fontSize: 15, fontWeight: '600', marginTop: 22, marginBottom: 10, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 48, borderRadius: 24, paddingLeft: 10, paddingRight: 16, flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 240 },
  chipText: { fontSize: 16, fontWeight: '600' },
  list: { marginTop: 8, marginHorizontal: -16 },
});
