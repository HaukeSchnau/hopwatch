import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  actions,
  addDays,
  type Entry,
  type EntryPatch,
  formatClock,
  formatDuration,
  formatRelativeDay,
  MINUTE,
  pathLabel,
  type ResolvedContext,
  startOfDay,
  useContextById,
  useDayReport,
  useNow,
  useStint,
} from '@/core';

import { ContextPicker } from '../ContextPicker';
import { Dial } from '../Dial';
import { dialFrame } from '../geometry';
import { SheetHeader } from '../sheet';
import { alpha, font, neon, sky } from '../theme';
import { TimeField } from '../TimeField';
import { Label, LiveDuration, Moon, PillButton, Squish } from '../ui';

/** Edits one entry: context, start, end and note; or deletes it. The id `running` opens the running entry. */
export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useStint((s) => s.entries.find((e) => (id === 'running' ? e.endUtc === null : e.id === id)) ?? null);
  const context = useContextById(entry?.contextId);
  if (!entry || !context) {
    return (
      <View>
        <SheetHeader title="Entry gone" />
        <Text style={styles.gone}>This entry was changed or removed.</Text>
      </View>
    );
  }
  return <EntryEditor entry={entry} context={context} />;
}

function EntryEditor({ entry, context }: { entry: Entry; context: ResolvedContext }) {
  const now = useNow(entry.endUtc === null ? 1000 : null);
  const [picking, setPicking] = useState(false);
  const color = neon[context.hue];
  const running = entry.endUtc === null;
  const update = (patch: EntryPatch, label?: string) => {
    Haptics.selectionAsync();
    actions.updateEntry(entry.id, patch, label);
  };

  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 48 }}>
      <SheetHeader
        kicker={running ? 'Running' : formatRelativeDay(entry.startUtc, now)}
        title="Entry"
      />

      <EntryRing entry={entry} color={color} now={now} />

      <Pressable
        onPress={() => setPicking((p) => !p)}
        style={[styles.card, styles.contextRow, { borderColor: alpha(color, 0.35) }]}
        accessibilityRole="button"
        accessibilityLabel={`Context ${context.name}. Change.`}>
        <Moon context={context} size={40} filled />
        <View style={{ flex: 1 }}>
          <Text style={styles.contextName} numberOfLines={1}>
            {context.name}
          </Text>
          {context.ancestors.length > 0 && (
            <Text style={styles.path} numberOfLines={1}>
              {pathLabel(context)}
            </Text>
          )}
        </View>
        <Text style={styles.change}>{picking ? 'Close' : 'Change'}</Text>
      </Pressable>
      {picking && (
        <View style={styles.picker}>
          <ContextPicker
            selectedId={context.id}
            onPick={(next) => {
              setPicking(false);
              if (next.id !== context.id) update({ contextId: next.id }, `Moved to ${next.name}`);
            }}
          />
        </View>
      )}

      <View style={styles.card}>
        <TimeRow
          label="Start"
          value={entry.startUtc}
          color={color}
          max={entry.endUtc ?? now}
          onChange={(startUtc) => update({ startUtc }, `${context.name} starts ${formatClock(startUtc)}`)}
        />
        <View style={styles.divider} />
        {running ? (
          <View style={styles.timeBlock}>
            <Label>End</Label>
            <View style={styles.timeLine}>
              <Text style={[styles.runningText, { color }]}>running</Text>
              <PillButton title="Stop now" icon="stop.fill" tone={sky.danger} onPress={() => update({ endUtc: Date.now() }, `Stopped ${context.name}`)} style={styles.stopNow} />
            </View>
          </View>
        ) : (
          <TimeRow
            label="End"
            value={entry.endUtc ?? now}
            color={color}
            min={entry.startUtc}
            max={now}
            onChange={(endUtc) => update({ endUtc }, `${context.name} ends ${formatClock(endUtc)}`)}
          />
        )}
      </View>

      <NoteField entry={entry} />

      <PillButton
        title="Delete entry"
        icon="trash"
        tone={sky.danger}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          actions.deleteEntry(entry.id);
          router.back();
        }}
        style={styles.delete}
      />
    </ScrollView>
  );
}

/** The entry's day with the entry itself lit and everything else dimmed. */
function EntryRing({ entry, color, now }: { entry: Entry; color: string; now: number }) {
  const day = startOfDay(entry.startUtc);
  const report = useDayReport(day);
  const frame = dialFrame(176, 11, 14);
  const end = entry.endUtc ?? now;
  return (
    <View style={styles.ring}>
      <Dial
        frame={frame}
        dayStart={day}
        dayEnd={addDays(day, 1)}
        detail="mini"
        now={now < addDays(day, 1) ? now : null}
        arcs={report.segments.map((s) => ({
          key: s.entry.id,
          start: s.start,
          end: s.running ? now : s.end,
          color: s.entry.id === entry.id ? color : neon[s.context.hue],
          running: s.running,
          faded: s.entry.id !== entry.id,
        }))}
      />
      <View style={[StyleSheet.absoluteFill, styles.ringCenter]} pointerEvents="none">
        {entry.endUtc === null ? (
          <LiveDuration since={entry.startUtc} size={24} />
        ) : (
          <Text style={styles.ringDuration}>{formatDuration(end - entry.startUtc)}</Text>
        )}
      </View>
    </View>
  );
}

/** A labelled date and time field with ±5 minute nudges. */
function TimeRow({
  label,
  value,
  color,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  color: string;
  min?: number;
  max: number;
  onChange: (ts: number) => void;
}) {
  const clamp = (ts: number) => Math.min(max, Math.max(min ?? Number.NEGATIVE_INFINITY, ts));
  return (
    <View style={styles.timeBlock}>
      <Label>{label}</Label>
      <View style={styles.timeLine}>
        <TimeField value={value} color={color} withDate min={min} max={max} onChange={(t) => onChange(clamp(t))} />
        <View style={{ flex: 1 }} />
        <Nudge label="−5" onPress={() => onChange(clamp(value - 5 * MINUTE))} />
        <Nudge label="+5" onPress={() => onChange(clamp(value + 5 * MINUTE))} disabled={value + MINUTE > max} />
      </View>
    </View>
  );
}

function Nudge({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Squish onPress={onPress} disabled={disabled} scaleTo={0.9} style={[styles.nudge, disabled && { opacity: 0.3 }]} accessibilityLabel={`${label} minutes`}>
      <Text style={styles.nudgeText}>{label}</Text>
    </Squish>
  );
}

/** The note, saved when editing ends or the sheet closes. */
function NoteField({ entry }: { entry: Entry }) {
  const [note, setNote] = useState(entry.note ?? '');
  const pending = useRef<string | null>(null);
  const id = entry.id;
  const commit = () => {
    if (pending.current === null) return;
    actions.updateEntry(id, { note: pending.current.trim() || null }, 'Note saved');
    pending.current = null;
  };
  useEffect(
    () => () => {
      if (pending.current !== null) actions.updateEntry(id, { note: pending.current.trim() || null }, 'Note saved');
    },
    [id],
  );
  return (
    <View style={[styles.card, styles.noteCard]}>
      <SymbolView name="text.alignleft" size={15} tintColor={sky.faint} style={{ marginTop: 3 }} />
      <TextInput
        value={note}
        onChangeText={(text) => {
          setNote(text);
          pending.current = text;
        }}
        onEndEditing={commit}
        placeholder="Add a note"
        placeholderTextColor={sky.faint}
        keyboardAppearance="dark"
        multiline
        style={styles.note}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gone: { textAlign: 'center', padding: 24, fontFamily: font.text, fontSize: 15, color: sky.dim },
  ring: { alignSelf: 'center', marginTop: 2, marginBottom: 14 },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringDuration: { fontFamily: font.display, fontSize: 24, color: sky.text, letterSpacing: -0.5 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 16 },
  contextName: { fontFamily: font.textBold, fontSize: 17, color: sky.text, letterSpacing: -0.3 },
  path: { marginTop: 2, fontFamily: font.mono, fontSize: 10, letterSpacing: 1, color: sky.dim, textTransform: 'uppercase' },
  change: { fontFamily: font.textBold, fontSize: 14, color: sky.accent },
  picker: { marginBottom: 12 },
  timeBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 6 },
  timeLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40 },
  runningText: { flex: 1, fontFamily: font.mono, fontSize: 14 },
  stopNow: { minHeight: 40, paddingHorizontal: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: sky.hairlineHi, marginLeft: 16 },
  nudge: {
    width: 44,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: sky.hairlineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeText: { fontFamily: font.mono, fontSize: 12.5, color: sky.dim },
  noteCard: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  note: { flex: 1, minHeight: 44, fontFamily: font.text, fontSize: 15, lineHeight: 21, color: sky.text, paddingTop: 0 },
  delete: { alignSelf: 'center', marginTop: 12 },
});
