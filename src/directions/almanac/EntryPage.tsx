// The entry page: one block of time, its context, start, end and note. Times are
// staged on a wheel and set with a button that says what the change will trim.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  type Entry,
  type EntryId,
  formatClock,
  formatDuration,
  formatRelativeDay,
  useContextById,
  useEntries,
  useEntry,
  useNow,
  useStint,
  useTree,
} from '@/core';

import { dayParam } from './dates';
import { describeCarve } from './effects';
import { goBack, PageHeader } from './PageHeader';
import { Paper } from './Paper';
import { Riso } from './Riso';
import { font, ink, margin, paper, riso } from './theme';
import { TimeWheel } from './TimeWheel';
import { Caps, InkLink, Rule } from './type';
import { formatDateline } from './words';

export function EntryPage({ id }: { id: EntryId }) {
  const insets = useSafeAreaInsets();
  const entry = useEntry(id);
  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 100, paddingHorizontal: margin }}>
        <PageHeader title="The Entry" folio="p. 2a" backLabel="Back" />
        {entry ? (
          <EntryBody entry={entry} />
        ) : (
          <View style={styles.gone}>
            <Text style={styles.goneTitle}>This entry has been struck from the record.</Text>
            <InkLink onPress={goBack} style={{ alignSelf: 'flex-start', marginTop: 12 }}>
              ‹ Back
            </InkLink>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function EntryBody({ entry }: { entry: Entry }) {
  const context = useContextById(entry.contextId);
  const now = useNow(entry.endUtc === null ? 1000 : null);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const end = entry.endUtc ?? now;
  if (!context) return null;
  const ink_ = riso[context.hue];

  return (
    <View>
      <View style={styles.hero}>
        <Caps color={ink_.type} numberOfLines={1}>
          {context.ancestors.length ? context.ancestors.map((a) => a.name).join(' › ') : 'Filed under'}
        </Caps>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={2}>
            {context.glyph ? `${context.glyph} ` : ''}
            <Text style={{ fontFamily: font.displayItalic, color: ink_.type }}>{context.name}</Text>
          </Text>
          <InkLink
            textStyle={styles.refile}
            onPress={() => router.push({ pathname: '/almanac/pick', params: { for: 'entry', id: entry.id } })}>
            Refile
          </InkLink>
        </View>
        <Text style={styles.day}>
          {formatDateline(entry.startUtc)}
          {entry.endUtc === null ? ' · still running' : ''}
        </Text>
      </View>

      <Riso hue={context.hue} style={styles.band} offset={{ x: 2, y: 1.5 }}>
        <View style={styles.times}>
          <TimeCell
            label="From"
            value={entry.startUtc}
            active={editing === 'start'}
            onPress={() => setEditing(editing === 'start' ? null : 'start')}
            color={ink_.on}
          />
          <View style={[styles.timesRule, { backgroundColor: ink_.on }]} />
          {entry.endUtc === null ? (
            <View style={styles.timeCell}>
              <Text style={[styles.timeLabel, { color: ink_.on }]}>To</Text>
              <Text style={[styles.timeValue, { color: ink_.on, fontFamily: font.displayItalic, textDecorationLine: 'none' }]}>now</Text>
            </View>
          ) : (
            <TimeCell
              label="To"
              value={entry.endUtc}
              active={editing === 'end'}
              onPress={() => setEditing(editing === 'end' ? null : 'end')}
              color={ink_.on}
            />
          )}
        </View>
      </Riso>
      <Text style={styles.length}>
        <Text style={styles.lengthFigure}>{formatDuration(end - entry.startUtc)}</Text> on the record.
        {entry.endUtc === null ? ' ' : ''}
        {entry.endUtc === null && (
          <Text
            style={styles.inlineLink}
            onPress={() => router.push({ pathname: '/almanac/slip', params: { kind: 'stop' } })}>
            Stop it earlier…
          </Text>
        )}
      </Text>

      {editing && <TimeEditor key={editing} entry={entry} edge={editing} onDone={() => setEditing(null)} />}

      <Note entry={entry} />

      <Rule style={{ marginTop: 34 }} />
      <View style={styles.footer}>
        <InkLink
          onPress={() => router.push({ pathname: '/almanac/day', params: { date: dayParam(entry.startUtc) } })}
          textStyle={styles.footLink}>
          See the day →
        </InkLink>
        <InkLink
          color={ink.red}
          textStyle={styles.footLink}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            actions.deleteEntry(entry.id);
            goBack();
          }}>
          Strike this entry
        </InkLink>
      </View>
    </View>
  );
}

function TimeCell({
  label,
  value,
  active,
  onPress,
  color,
}: {
  label: string;
  value: number;
  active: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatClock(value)}, change`}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.timeCell, pressed && { opacity: 0.6 }]}>
      <Text style={[styles.timeLabel, { color }]}>{label}</Text>
      <Text style={[styles.timeValue, { color }, active && styles.timeActive]}>{formatClock(value)}</Text>
    </Pressable>
  );
}

/** A wheel for one edge of the entry, and a button that says what setting it will do. */
function TimeEditor({ entry, edge, onDone }: { entry: Entry; edge: 'start' | 'end'; onDone: () => void }) {
  const entries = useEntries();
  const tree = useTree();
  const now = useNow(15_000);
  const original = edge === 'start' ? entry.startUtc : (entry.endUtc ?? now);
  const [value, setValue] = useState(original);
  const start = edge === 'start' ? value : entry.startUtc;
  const end = edge === 'end' ? value : entry.endUtc;
  const effect = describeCarve(entries, tree, start, end, now, entry.id);
  const changed = value !== original;

  return (
    <View style={styles.editor}>
      <Caps color={ink.full}>{edge === 'start' ? 'Started at' : 'Ended at'}</Caps>
      <View style={styles.editorWheel}>
        <TimeWheel
          value={value}
          onChange={setValue}
          min={edge === 'end' ? entry.startUtc : undefined}
          max={edge === 'start' ? (entry.endUtc ?? now) : now}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!changed}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const name = useStint.getState().tree.byId.get(entry.contextId)?.name ?? 'Entry';
          actions.updateEntry(
            entry.id,
            edge === 'start' ? { startUtc: value } : { endUtc: value },
            `${name} now ${edge === 'start' ? 'starts' : 'ends'} at ${formatClock(value)}`,
          );
          onDone();
        }}
        style={({ pressed }) => [styles.set, !changed && { opacity: 0.3 }, pressed && { opacity: 0.8 }]}>
        <Text style={styles.setText}>
          Set {edge === 'start' ? 'start' : 'end'} to {formatClock(value)}
        </Text>
        <Text style={styles.setNote}>{formatRelativeDay(value, now)}</Text>
      </Pressable>
      {changed && effect && <Text style={styles.effect}>{effect}</Text>}
    </View>
  );
}

/** The note, set in the text face on ruled lines. Saved when you leave the field or the page. */
function Note({ entry }: { entry: Entry }) {
  const [text, setText] = useState(entry.note ?? '');
  const latest = useRef({ text, saved: entry.note ?? '', id: entry.id as EntryId });
  latest.current.text = text;

  const save = () => {
    const { text: value, saved, id } = latest.current;
    const next = value.trim();
    if (next === saved.trim()) return;
    latest.current.saved = next;
    actions.updateEntry(id, { note: next || null }, next ? 'Note filed' : 'Note removed');
  };

  // Leaving the page without dismissing the keyboard still saves.
  useEffect(() => () => save(), []);

  return (
    <View style={styles.note}>
      <Caps color={ink.full}>Note</Caps>
      <TextInput
          selectionColor={ink.red}
        value={text}
        onChangeText={setText}
        onEndEditing={save}
        placeholder="What happened in this stretch? (optional)"
        placeholderTextColor={ink.faint}
        multiline
        style={styles.noteInput}
        accessibilityLabel="Note"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  name: { flex: 1, fontFamily: font.display, fontSize: 48, lineHeight: 52, color: ink.full, letterSpacing: -0.5 },
  refile: { fontSize: 20, marginBottom: 8 },
  day: { marginTop: 4, fontFamily: font.textItalic, fontSize: 17, color: ink.soft },
  band: { marginTop: 22 },
  times: { flexDirection: 'row' },
  timeCell: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, minHeight: 92 },
  timesRule: { width: 1, opacity: 0.4, marginVertical: 12 },
  timeLabel: { fontFamily: font.sansBold, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  timeValue: {
    fontFamily: font.display,
    fontSize: 50,
    lineHeight: 56,
    fontVariant: ['tabular-nums'],
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  timeActive: { textDecorationStyle: 'solid' },
  length: { marginTop: 12, fontFamily: font.textItalic, fontSize: 17, color: ink.soft },
  lengthFigure: { fontFamily: font.textMedium, fontStyle: 'normal', color: ink.full },
  inlineLink: { color: ink.full, textDecorationLine: 'underline' },
  editor: { marginTop: 22, padding: 16, backgroundColor: paper.slip, borderWidth: 1, borderColor: ink.full },
  editorWheel: { marginHorizontal: -16 },
  set: { minHeight: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.full, paddingVertical: 6 },
  setText: { fontFamily: font.displayItalic, fontSize: 23, color: paper.sheet },
  setNote: { fontFamily: font.sans, fontSize: 11, color: 'rgba(243,237,226,0.65)' },
  effect: { marginTop: 10, fontFamily: font.textItalic, fontSize: 15, lineHeight: 20, color: ink.soft, textAlign: 'center' },
  note: { marginTop: 30 },
  noteInput: {
    marginTop: 8,
    minHeight: 96,
    fontFamily: font.textItalic,
    fontSize: 20,
    lineHeight: 28,
    color: ink.full,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: ink.full,
    textAlignVertical: 'top',
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  footLink: { fontSize: 20 },
  gone: { marginTop: 30 },
  goneTitle: { fontFamily: font.display, fontSize: 36, lineHeight: 40, color: ink.full },
});
