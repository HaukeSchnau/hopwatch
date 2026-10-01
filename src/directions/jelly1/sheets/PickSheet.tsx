// One picker for every "choose a jelly" moment, driven by the `mode` search param:
//   start   the whole tree, one tap from Now          /jelly1/pick?mode=start
//   fill    "What was this?" for a gap                /jelly1/pick?mode=fill&from=…&to=…
//   entry   change an entry's context                 /jelly1/pick?mode=entry&entry=…
//   parent  move a context under another one          /jelly1/pick?mode=parent&id=…

import DateTimePicker from '@expo/ui/community/datetime-picker';
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
import { candy, colors, fonts } from '../theme';
import { CandySurface, Squishy } from '../ui';
import { sheetStyles } from './parts';

type Params = { mode?: string; from?: string; to?: string; entry?: string; id?: string };

export function PickSheet() {
  const params = useLocalSearchParams<Params>();
  const mode = params.mode ?? 'start';
  const tree = useTree();
  const entries = useEntries();
  const pickable = usePickableContexts();
  const [query, setQuery] = useState('');

  const gapFrom = Number(params.from);
  const gapTo = Number(params.to);
  // The gap's bounds, adjustable so a long gap can be filled in part.
  const [from, setFrom] = useState(gapFrom);
  const [to, setTo] = useState(gapTo);
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
    <ScrollView contentContainerStyle={[sheetStyles.body, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {mode === 'fill' && Number.isFinite(gapFrom) && Number.isFinite(gapTo) && (
        <View style={styles.range}>
          <Text style={styles.rangeLabel}>From</Text>
          <DateTimePicker
            value={new Date(from)}
            mode="time"
            display="compact"
            style={{ width: 92, height: 38 }}
            locale="en_GB"
            themeVariant="light"
            accentColor={colors.pinkDeep}
            onValueChange={(_, d) => setFrom(clamp(onDay(gapFrom, d), gapFrom, to - MINUTE))}
          />
          <Text style={styles.rangeLabel}>to</Text>
          <DateTimePicker
            value={new Date(to)}
            mode="time"
            display="compact"
            style={{ width: 92, height: 38 }}
            locale="en_GB"
            themeVariant="light"
            accentColor={colors.pinkDeep}
            onValueChange={(_, d) => setTo(clamp(onDay(gapTo, d), from + MINUTE, gapTo))}
          />
        </View>
      )}
      {pickable.length > 8 && (
        <View style={styles.search}>
          <SymbolView name="magnifyingglass" size={16} tintColor={colors.muted} weight="bold" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Find a jelly"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      )}
      <View style={styles.list}>
        {mode === 'parent' && moving && !q && <Row label="Top level" glyph="🏠" hue="gray" depth={0} onPress={() => pick(null)} selected={moving.parentId === null} />}
        {list.map((c) => (
          <Row
            key={c.id}
            label={q ? pathLabel(c) : c.name}
            glyph={c.glyph}
            hue={c.hue}
            depth={q ? 0 : c.depth}
            selected={(mode === 'entry' && entry?.contextId === c.id) || (mode === 'parent' && moving?.parentId === c.id)}
            onPress={() => pick(c)}
          />
        ))}
        {list.length === 0 && <Text style={styles.empty}>No jelly matches "{query}".</Text>}
      </View>
    </ScrollView>
  );
}

const clamp = (t: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, t));

/** The day of `base` at the picked wall-clock time. */
function onDay(base: number, picked: Date): number {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return d.getTime();
}

function Row({
  label,
  glyph,
  hue,
  depth,
  selected,
  onPress,
}: {
  label: string;
  glyph: string | null;
  hue: ResolvedContext['hue'];
  depth: number;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Squishy amount={0.06} onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}>
      <View style={[styles.row, { marginLeft: depth * 22 }, selected && { backgroundColor: candy[hue].tint }]}>
        <CandySurface hue={hue} radius={17} flat style={styles.dot}>
          <Text style={styles.dotEmoji}>{glyph ?? ''}</Text>
        </CandySurface>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
        {selected && <SymbolView name="checkmark" size={16} tintColor={candy[hue].deep} weight="heavy" />}
      </View>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.textBold, fontSize: 16, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 46,
    marginTop: 16,
    borderWidth: 2,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontFamily: fonts.text, fontSize: 17, color: colors.ink },
  list: { marginTop: 14, gap: 2 },
  range: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  rangeLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 8, borderRadius: 18 },
  dot: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  dotEmoji: { fontSize: 17 },
  rowLabel: { flex: 1, fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  empty: { fontFamily: fonts.text, fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 20 },
});
