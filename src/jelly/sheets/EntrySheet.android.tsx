// Entry detail on Android: the same draft as iOS (entry.tsx) under the candy header, with
// a dropdown for the jelly and calendar-style day and time pills for start and end.

import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { type Entry, pathLabel, useEntries } from '@/core';
import { sheetsText } from '@/i18n/sheets';

import { HostedRow, JellyForm } from '../forms';
import { DateTimeRow, FieldRow, PickerRow, Row, Section, TonalButton } from '../material';
import { useTheme } from '../theme';
import { EntryHeader, useEntryDraft } from './entry';

const s = sheetsText.entry;

export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = useEntries().find((e) => e.id === id) ?? null;
  if (!entry) {
    return (
      <JellyForm title={s.title}>
        <Section>
          <Row label={s.gone} />
        </Section>
      </JellyForm>
    );
  }
  // Keyed so the draft resets when a different entry opens.
  return <EntryForm key={entry.id} entry={entry} />;
}

function EntryForm({ entry }: { entry: Entry }) {
  const t = useTheme();
  const { contextId, setContextId, start, setStart, end, setEnd, now, context, options, invalid, save, remove } = useEntryDraft(entry);
  const [note, setNote] = useState(entry.note ?? '');

  return (
    <JellyForm
      title={end === null ? s.running : s.title}
      tint={context ? t.candy[context.hue].ink : undefined}
      confirm={{ label: sheetsText.done, onPress: () => save(note), disabled: invalid }}>
      {context ? (
        <HostedRow color={t.candy[context.hue].tint} render={(width) => <EntryHeader width={width} context={context} start={start} end={end} />} />
      ) : null}
      <Section>
        <PickerRow
          label={s.jelly}
          choices={options.map((c) => ({ value: c.id, label: `${c.glyph ? `${c.glyph} ` : ''}${pathLabel(c)}` }))}
          value={contextId}
          onChange={setContextId}
        />
      </Section>
      <Section title={s.time} footer={invalid ? s.endsBeforeStart : s.trims}>
        {/* Clamped like the iOS pickers' ranges: start before the end, the end between start and now. */}
        <DateTimeRow label={s.starts} value={start} latest={end ?? now} onChange={(at) => setStart(Math.min(at, end ?? now))} />
        {end === null ? (
          <Row label={s.ends} trailing={<TonalButton label={s.stopNow} icon="stop" onPress={() => setEnd(Math.max(start + 60_000, Date.now()))} />} />
        ) : (
          <DateTimeRow label={s.ends} value={end} earliest={start} latest={now} onChange={(at) => setEnd(Math.min(Math.max(at, start), now))} />
        )}
      </Section>
      <Section title={s.note}>
        <FieldRow value={note} onChangeText={setNote} placeholder={s.notePlaceholder} multiline style={{ maxHeight: 160 }} />
      </Section>
      <Section>
        <Row label={s.delete} icon="delete" destructive onPress={remove} />
      </Section>
    </JellyForm>
  );
}
