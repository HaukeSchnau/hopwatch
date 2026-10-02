// Entry detail as a native form under a candy header: which jelly, start, end and note,
// saved together on Done so a half-spun wheel never trims a neighbour. Delete is
// undoable from the toast. Android: EntrySheet.android.tsx; the draft is in entry.tsx.

import { Button, DatePicker, HStack, Picker, Section, Spacer, Text as SwiftText, TextField, useNativeState } from '@expo/ui/swift-ui';
import { environment, lineLimit, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useLocalSearchParams } from 'expo-router';

import { type Entry, pathLabel, useEntries } from '@/core';
import { sheetsText } from '@/i18n/sheets';

import { HostedRow, JellyForm } from '../forms';
import { useTheme } from '../theme';
import { EntryHeader, useEntryDraft } from './entry';
import { pickerLocale } from './parts';

const s = sheetsText.entry;
const clock24 = environment('locale', pickerLocale);

export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = useEntries().find((e) => e.id === id) ?? null;
  if (!entry) {
    return (
      <JellyForm title={s.title}>
        <Section>
          <SwiftText>{s.gone}</SwiftText>
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
  const note = useNativeState(entry.note ?? '');
  const running = end === null;

  return (
    <JellyForm title={running ? s.running : s.title} tint={context ? t.candy[context.hue].ink : undefined} confirm={{ label: sheetsText.done, onPress: () => save(note.get()), disabled: invalid }}>
      {context ? (
        <HostedRow color={t.candy[context.hue].tint} render={(width) => <EntryHeader width={width} context={context} start={start} end={end} />} />
      ) : null}
      <Section>
        <Picker
          label={s.jelly}
          selection={contextId}
          onSelectionChange={(value: string) => {
            const next = options.find((c) => c.id === value);
            if (next) setContextId(next.id);
          }}
          modifiers={[pickerStyle('menu')]}>
          {options.map((c) => (
            <SwiftText key={c.id} modifiers={[tag(c.id)]}>
              {`${c.glyph ? `${c.glyph} ` : ''}${pathLabel(c)}`}
            </SwiftText>
          ))}
        </Picker>
      </Section>
      <Section title={s.time} footer={<SwiftText>{invalid ? s.endsBeforeStart : s.trims}</SwiftText>}>
        <DatePicker
          title={s.starts}
          selection={new Date(start)}
          range={{ end: new Date(end ?? now) }}
          displayedComponents={['date', 'hourAndMinute']}
          onDateChange={(date) => setStart(date.getTime())}
          modifiers={[clock24]}
        />
        {running ? (
          <HStack>
            <SwiftText>{s.ends}</SwiftText>
            <Spacer />
            <Button label={s.stopNow} systemImage="stop.fill" onPress={() => setEnd(Math.max(start + 60_000, Date.now()))} />
          </HStack>
        ) : (
          <DatePicker
            title={s.ends}
            selection={new Date(end)}
            range={{ start: new Date(start), end: new Date(now) }}
            displayedComponents={['date', 'hourAndMinute']}
            onDateChange={(date) => setEnd(date.getTime())}
            modifiers={[clock24]}
          />
        )}
      </Section>
      <Section title={s.note}>
        <TextField text={note} placeholder={s.notePlaceholder} axis="vertical" modifiers={[lineLimit(6)]} />
      </Section>
      <Section>
        <Button role="destructive" label={s.delete} systemImage="trash" onPress={remove} />
      </Section>
    </JellyForm>
  );
}
