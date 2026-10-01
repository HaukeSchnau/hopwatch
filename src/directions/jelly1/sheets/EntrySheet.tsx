// Entry detail: change the context, start, end and note, or delete it. Times and the
// note are drafted locally and saved together, so spinning a picker never trims a
// neighbour halfway.

import DateTimePicker from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  actions,
  addDays,
  type Entry,
  formatDuration,
  formatLongDay,
  pathLabel,
  startOfDay,
  useEntries,
  useNow,
  useTree,
} from '@/core';

import { buzz } from '../feedback';
import { candy, colors, fonts } from '../theme';
import { inkCandy, JellyButton, Squishy } from '../ui';
import { SheetHeader, sheetStyles } from './parts';

export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = useEntries().find((e) => e.id === id) ?? null;
  if (!entry) {
    return (
      <ScrollView contentContainerStyle={sheetStyles.body}>
        <SheetHeader context={null} title="This entry is gone" subtitle="It was deleted or merged away." />
        <JellyButton label="Close" palette={inkCandy} onPress={() => router.back()} style={{ marginTop: 24 }} />
      </ScrollView>
    );
  }
  // Keyed so the draft resets when a different entry opens.
  return <EntryEditor key={entry.id} entry={entry} />;
}

function EntryEditor({ entry }: { entry: Entry }) {
  const tree = useTree();
  const context = tree.byId.get(entry.contextId) ?? null;
  const now = useNow(entry.endUtc === null ? 1000 : null);
  const [start, setStart] = useState(new Date(entry.startUtc));
  const [end, setEnd] = useState(entry.endUtc === null ? null : new Date(entry.endUtc));
  const [note, setNote] = useState(entry.note ?? '');

  const running = entry.endUtc === null;
  const startMs = start.getTime();
  const endMs = end?.getTime() ?? now;
  const invalid = end !== null && endMs <= startMs;
  const dirty =
    startMs !== entry.startUtc || (end?.getTime() ?? null) !== entry.endUtc || (note.trim() || null) !== entry.note;

  const save = () => {
    if (invalid) return buzz.warn();
    actions.updateEntry(entry.id, {
      startUtc: startMs,
      ...(end ? { endUtc: end.getTime() } : {}),
      note: note.trim() || null,
    });
    buzz.success();
    router.back();
  };

  const hue = context?.hue ?? 'gray';
  return (
    <ScrollView contentContainerStyle={[sheetStyles.body, { paddingBottom: 48 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Squishy
        amount={0.05}
        onPress={() => router.push({ pathname: '/jelly1/pick', params: { mode: 'entry', entry: entry.id } })}
        accessibilityRole="button"
        accessibilityHint="Change which jelly this entry belongs to">
        <SheetHeader
          context={context}
          title={context?.name ?? 'Unknown'}
          subtitle={
            <Text>
              {context && context.ancestors.length ? `${pathLabel(context)} · ` : ''}
              <Text style={{ color: candy[hue].deep }}>change</Text>
            </Text>
          }
        />
      </Squishy>

      <Text style={[sheetStyles.label, { marginTop: 22 }]}>{formatLongDay(startMs)}</Text>
      <View style={styles.card}>
        <Row label="Start">
          <DateTimePicker
            value={start}
            mode="time"
            display="compact"
            style={{ width: 92, height: 38 }}
            locale="en_GB"
            themeVariant="light"
            accentColor={candy[hue].deep}
            onValueChange={(_, d) => setStart(atTime(entry.startUtc, d))}
          />
        </Row>
        <View style={styles.divider} />
        <Row label={end && startOfDay(end.getTime()) > startOfDay(startMs) ? 'End (next day)' : 'End'}>
          {end ? (
            <DateTimePicker
              value={end}
              mode="time"
              display="compact"
              style={{ width: 92, height: 38 }}
              locale="en_GB"
              themeVariant="light"
              accentColor={candy[hue].deep}
              onValueChange={(_, d) => {
                // An end before the start means the entry ran past midnight.
                const t = atTime(startMs, d);
                setEnd(t.getTime() <= startMs ? new Date(addDays(t.getTime(), 1)) : t);
              }}
            />
          ) : (
            <View style={styles.runningChip}>
              <View style={[styles.dot, { backgroundColor: candy[hue].fill }]} />
              <Text style={styles.runningText}>Running</Text>
            </View>
          )}
        </Row>
        <View style={styles.divider} />
        <Row label="Length">
          <Text style={[styles.length, invalid && { color: colors.danger }]}>{invalid ? 'Ends before it starts' : formatDuration(endMs - startMs)}</Text>
        </Row>
      </View>

      <Text style={sheetStyles.label}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="What happened? (optional)"
        placeholderTextColor={colors.faint}
        multiline
        style={styles.note}
        maxLength={500}
      />

      <JellyButton label={dirty ? 'Save' : 'Done'} hue={hue} size="large" onPress={dirty ? save : () => router.back()} disabled={invalid} style={{ marginTop: 22 }} />
      {running && (
        <JellyButton
          label="Stop now"
          icon="stop.fill"
          palette={inkCandy}
          onPress={() => {
            actions.stop();
            router.back();
          }}
          style={{ marginTop: 12 }}
        />
      )}
      <Squishy
        onPress={() => {
          buzz.thud();
          actions.deleteEntry(entry.id);
          router.back();
        }}
        accessibilityRole="button"
        style={styles.delete}>
        <SymbolView name="trash" size={16} tintColor={colors.danger} weight="bold" />
        <Text style={styles.deleteText}>Delete entry</Text>
      </Squishy>
    </ScrollView>
  );
}

/** The day of `base` at the wall-clock time picked in `picked`. */
function atTime(base: number, picked: Date): Date {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return d;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  rowLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  divider: { height: 1.5, backgroundColor: colors.line, borderRadius: 1 },
  runningChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  runningText: { fontFamily: fonts.textBold, fontSize: 16, color: colors.muted },
  length: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  note: {
    fontFamily: fonts.text,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    paddingTop: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 12 },
  deleteText: { fontFamily: fonts.display, fontSize: 17, color: colors.danger },
});
