// Entry detail as a native form under a candy header: which jelly, start, end and note,
// saved together on Done so a half-spun wheel never trims a neighbour. Delete is
// undoable from the toast.

import { Button, DatePicker, HStack, Picker, Section, Spacer, Text as SwiftText, TextField, useNativeState } from '@expo/ui/swift-ui';
import { environment, lineLimit, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  actions,
  type ContextId,
  type Entry,
  type EntryPatch,
  formatClock,
  formatDayMonth,
  formatDuration,
  formatWeekday,
  pathLabel,
  type ResolvedContext,
  useEntries,
  useNow,
  usePickableContexts,
  useTree,
} from '@/core';

import { Character } from '../Character';
import { buzz } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { useFace, useLively } from '../Gummy';
import { tabular, text, useTheme } from '../theme';

const clock24 = environment('locale', 'en_GB');

export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = useEntries().find((e) => e.id === id) ?? null;
  if (!entry) {
    return (
      <JellyForm title="Entry">
        <Section>
          <SwiftText>This entry is gone. It was deleted or merged away.</SwiftText>
        </Section>
      </JellyForm>
    );
  }
  // Keyed so the draft resets when a different entry opens.
  return <EntryForm key={entry.id} entry={entry} />;
}

function EntryForm({ entry }: { entry: Entry }) {
  const t = useTheme();
  const tree = useTree();
  const pickable = usePickableContexts();
  const [contextId, setContextId] = useState<ContextId>(entry.contextId);
  const [start, setStart] = useState(entry.startUtc);
  const [end, setEnd] = useState(entry.endUtc);
  const note = useNativeState(entry.note ?? '');
  const now = useNow(60_000);
  const context = tree.byId.get(contextId) ?? null;
  const options = pickable.some((c) => c.id === contextId) || !context ? pickable : [context, ...pickable];
  const running = end === null;
  const invalid = end !== null && end <= start;

  const save = () => {
    if (invalid) return buzz.warn();
    const patch: EntryPatch = {};
    if (contextId !== entry.contextId) patch.contextId = contextId;
    if (start !== entry.startUtc) patch.startUtc = start;
    if (end !== entry.endUtc) patch.endUtc = end;
    const typed = note.get().trim() || null;
    if (typed !== entry.note) patch.note = typed;
    if (Object.keys(patch).length) {
      buzz.success();
      actions.updateEntry(entry.id, patch);
    }
    router.back();
  };

  return (
    <JellyForm title={running ? 'Running' : 'Entry'} tint={context ? t.candy[context.hue].ink : undefined} confirm={{ label: 'Done', onPress: save, disabled: invalid }}>
      {context ? (
        <HostedRow color={t.candy[context.hue].tint} render={(width) => <Header width={width} context={context} start={start} end={end} />} />
      ) : null}
      <Section>
        <Picker
          label="Jelly"
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
      <Section title="Time" footer={<SwiftText>{invalid ? 'It ends before it starts.' : 'Changing the time trims any entry it overlaps.'}</SwiftText>}>
        <DatePicker
          title="Starts"
          selection={new Date(start)}
          range={{ end: new Date(end ?? now) }}
          displayedComponents={['date', 'hourAndMinute']}
          onDateChange={(date) => setStart(date.getTime())}
          modifiers={[clock24]}
        />
        {running ? (
          <HStack>
            <SwiftText>Ends</SwiftText>
            <Spacer />
            <Button label="Stop Now" systemImage="stop.fill" onPress={() => setEnd(Math.max(start + 60_000, Date.now()))} />
          </HStack>
        ) : (
          <DatePicker
            title="Ends"
            selection={new Date(end)}
            range={{ start: new Date(start), end: new Date(now) }}
            displayedComponents={['date', 'hourAndMinute']}
            onDateChange={(date) => setEnd(date.getTime())}
            modifiers={[clock24]}
          />
        )}
      </Section>
      <Section title="Note">
        <TextField text={note} placeholder="What happened? (optional)" axis="vertical" modifiers={[lineLimit(6)]} />
      </Section>
      <Section>
        <Button
          role="destructive"
          label="Delete Entry"
          systemImage="trash"
          onPress={() => {
            buzz.thud();
            actions.deleteEntry(entry.id);
            router.back();
          }}
        />
      </Section>
    </JellyForm>
  );
}

/** The candy header: the jelly, when it ran and for how long (ticking while it runs). */
function Header({ width, context, start, end }: { width: number; context: ResolvedContext; start: number; end: number | null }) {
  const t = useTheme();
  const face = useFace(end === null ? 'awake' : 'asleep');
  useLively(face, end === null);
  const now = useNow(end === null ? 1000 : null);
  return (
    <View style={[styles.header, { width }]}>
      <Character context={context} size={76} face={face} />
      <View style={styles.titles}>
        {context.ancestors.length ? (
          <Text style={[text.caption, styles.path, { color: t.candy[context.hue].ink }]} numberOfLines={1}>
            {context.ancestors.map((a) => a.name).join(' › ')}
          </Text>
        ) : null}
        <Text style={[text.title3, { color: t.c.ink }]} numberOfLines={1}>
          {context.name}
        </Text>
        <Text style={[text.footnote, tabular, { color: t.c.muted }]} numberOfLines={1}>
          {formatWeekday(start)} {formatDayMonth(start)} · {formatClock(start)}–{end === null ? 'now' : formatClock(end)}
        </Text>
      </View>
      <Text style={[styles.length, tabular, { color: t.c.ink }]}>{formatDuration(Math.max(0, (end ?? now) - start))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 8, paddingRight: 16 },
  titles: { flex: 1 },
  path: { textTransform: 'uppercase', letterSpacing: 0.5 },
  length: { fontFamily: 'ui-rounded', fontWeight: '800', fontSize: 24 },
});
