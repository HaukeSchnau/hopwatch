// One picker for every "choose a jelly" moment, driven by the `mode` search param:
//   start   the whole tree, one tap from Now          /jelly/pick?mode=start
//   fill    "What was this?" for a gap                /jelly/pick?mode=fill&from=…&to=…[&at=…]
//           (`at` preselects the hour around it inside a long gap)
//   entry   change an entry's context                 /jelly/pick?mode=entry&entry=…
//   parent  move a context under another one          /jelly/pick?mode=parent&id=…

import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  actions,
  type ContextId,
  formatClock,
  formatDuration,
  MINUTE,
  pathLabel,
  type ResolvedContext,
  subtreeIds,
  useEntries,
  usePickableContexts,
  useTree,
} from '@/core';

import { buzz, play } from '../feedback';
import { Character } from '../Character';
import { tabular, text, useTheme } from '../theme';
import { Squishy } from '../ui';
import { sheetBody } from './parts';

type Params = { mode?: string; from?: string; to?: string; at?: string; entry?: string; id?: string };

const FIVE = 5 * MINUTE;

export function PickSheet() {
  const t = useTheme();
  const params = useLocalSearchParams<Params>();
  const mode = params.mode ?? 'start';
  const tree = useTree();
  const entries = useEntries();
  const pickable = usePickableContexts();
  const [query, setQuery] = useState('');

  const gapFrom = Number(params.from);
  const gapTo = Number(params.to);
  // The gap's bounds, adjustable so a long gap can be filled in part.
  const [from, setFrom] = useState(() => aroundAt(Number(params.at), gapFrom, gapTo).from);
  const [to, setTo] = useState(() => aroundAt(Number(params.at), gapFrom, gapTo).to);
  const entry = entries.find((e) => e.id === params.entry) ?? null;
  const moving = tree.ordered.find((c) => c.id === params.id) ?? null;
  const excluded = moving ? subtreeIds(tree, moving.id) : new Set<ContextId>();

  let title = 'Pick a jelly';
  let subtitle: string | null = null;
  let onPick: (c: ResolvedContext | null) => void = (c) => {
    if (!c) return;
    actions.start(c.id);
    play('pop');
  };
  if (mode === 'fill' && Number.isFinite(from) && Number.isFinite(to)) {
    title = 'What was this?';
    subtitle = `${formatClock(from)} – ${formatClock(to)} · ${formatDuration(to - from)}`;
    onPick = (c) => c && actions.fillGap(c.id, from, to);
  } else if (mode === 'entry' && entry) {
    const current = tree.byId.get(entry.contextId);
    title = 'Change to…';
    subtitle = `${current?.name ?? 'Entry'} · ${formatClock(entry.startUtc)} – ${entry.endUtc ? formatClock(entry.endUtc) : 'now'}`;
    onPick = (c) => c && actions.updateEntry(entry.id, { contextId: c.id });
  } else if (mode === 'parent' && moving) {
    title = `Move ${moving.name} into…`;
    onPick = (c) => actions.moveContext(moving.id, c?.id ?? null);
  }

  const q = query.trim().toLowerCase();
  const list = pickable.filter((c) => !excluded.has(c.id) && (!q || pathLabel(c).toLowerCase().includes(q)));
  const pick = (c: ResolvedContext | null) => {
    buzz.tap();
    onPick(c);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={[sheetBody, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={[text.title2, { color: t.c.ink }]}>{title}</Text>
      {subtitle ? <Text style={[text.subhead, tabular, styles.subtitle, { color: t.c.muted }]}>{subtitle}</Text> : null}
      {mode === 'fill' && Number.isFinite(gapFrom) && Number.isFinite(gapTo) && (
        <View style={styles.range}>
          <Text style={[text.headline, { color: t.c.ink }]}>From</Text>
          <DateTimePicker
            value={new Date(from)}
            mode="time"
            display="compact"
            style={{ width: 92, height: 38 }}
            locale="en_GB"
            themeVariant={t.scheme}
            accentColor={t.c.pinkDeep}
            onValueChange={(_, d) => setFrom(clamp(onDay(gapFrom, d), gapFrom, to - MINUTE))}
          />
          <Text style={[text.headline, { color: t.c.ink }]}>to</Text>
          <DateTimePicker
            value={new Date(to)}
            mode="time"
            display="compact"
            style={{ width: 92, height: 38 }}
            locale="en_GB"
            themeVariant={t.scheme}
            accentColor={t.c.pinkDeep}
            onValueChange={(_, d) => setTo(clamp(onDay(gapTo, d), from + MINUTE, gapTo))}
          />
        </View>
      )}
      {pickable.length > 8 && (
        <View style={[styles.search, { backgroundColor: t.c.sunken }]}>
          <SymbolView name="magnifyingglass" size={16} tintColor={t.c.muted} weight="bold" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find a jelly"
            placeholderTextColor={t.c.faint}
            style={[text.body, styles.searchInput, { color: t.c.ink }]}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      )}
      <View style={styles.list}>
        {mode === 'parent' && moving && !q && <Row label="Top level" context={null} depth={0} onPress={() => pick(null)} selected={moving.parentId === null} />}
        {list.map((c) => (
          <Row
            key={c.id}
            label={q ? pathLabel(c) : c.name}
            context={c}
            depth={q ? 0 : c.depth}
            selected={(mode === 'entry' && entry?.contextId === c.id) || (mode === 'parent' && moving?.parentId === c.id)}
            onPress={() => pick(c)}
          />
        ))}
        {list.length === 0 && <Text style={[text.body, styles.empty, { color: t.c.muted }]}>{`No jelly matches “${query}”.`}</Text>}
      </View>
    </ScrollView>
  );
}

const clamp = (t: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, t));

/** The whole gap, or the hour around `at` when the gap is much longer than that. */
function aroundAt(at: number, gapFrom: number, gapTo: number) {
  if (!Number.isFinite(at) || gapTo - gapFrom <= 90 * MINUTE) return { from: gapFrom, to: gapTo };
  const from = clamp(Math.round((at - 30 * MINUTE) / FIVE) * FIVE, gapFrom, gapTo - 60 * MINUTE);
  return { from, to: Math.min(gapTo, from + 60 * MINUTE) };
}

/** The day of `base` at the picked wall-clock time. */
function onDay(base: number, picked: Date): number {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return d.getTime();
}

/** One jelly to pick, with its sleeping character; `context` null is "Top level". */
function Row({
  label,
  context,
  depth,
  selected,
  onPress,
}: {
  label: string;
  context: ResolvedContext | null;
  depth: number;
  selected?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const c = t.candy[context?.hue ?? 'gray'];
  return (
    <Squishy amount={0.06} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}>
      <View style={[styles.row, { marginLeft: depth * 20 }, selected && { backgroundColor: c.tint }]}>
        {context ? (
          <Character context={context} size={38} shadow={false} />
        ) : (
          <View style={[styles.home, { backgroundColor: t.c.sunken }]}>
            <SymbolView name="house.fill" size={16} tintColor={t.c.muted} />
          </View>
        )}
        <Text style={[text.body, styles.rowLabel, { color: t.c.ink }]} numberOfLines={1}>
          {label}
        </Text>
        {selected && <SymbolView name="checkmark" size={16} tintColor={c.ink} weight="heavy" />}
      </View>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 12, height: 42, marginTop: 16 },
  searchInput: { flex: 1 },
  list: { marginTop: 14, gap: 2 },
  range: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 8, borderRadius: 18 },
  home: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 20 },
});
