import {
  Button,
  DatePicker,
  Form,
  Host,
  HStack,
  NavigationStack,
  Picker,
  Section,
  Spacer,
  Text,
  TextField,
  Toolbar,
  ToolbarItem,
  useNativeState,
  VStack,
} from '@expo/ui/swift-ui';
import { font, foregroundStyle, lineLimit, monospacedDigit, navigationTitle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  actions,
  type ContextId,
  type Entry,
  type EntryId,
  type EntryPatch,
  formatDuration,
  pathLabel,
  usePickableContexts,
  useEntry,
  useNow,
  useTree,
} from '@/core';

import { useTheme } from '../theme';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

/** The entry's length; ticks on its own while the entry runs. */
function Duration({ start, end }: { start: number; end: number | null }) {
  const now = useNow(end === null ? 1000 : null);
  return (
    <Text modifiers={[font({ size: 22, weight: 'semibold', design: 'rounded' }), monospacedDigit()]}>
      {formatDuration((end ?? now) - start)}
    </Text>
  );
}

/**
 * Entry detail as a native form: context, start, end and note, applied together on
 * Done so a half-scrolled time wheel never trims a neighbour. Delete is undoable.
 */
export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useEntry(id as EntryId);
  if (!entry) {
    return (
      <Host style={{ flex: 1 }}>
        <NavigationStack>
          <Toolbar>
            <Form modifiers={[navigationTitle('Entry')]}>
              <Section>
                <Text modifiers={[secondary]}>This entry no longer exists.</Text>
              </Section>
            </Form>
            <Toolbar.Content>
              <ToolbarItem placement="cancellationAction">
                <Button role="close" onPress={() => router.back()} />
              </ToolbarItem>
            </Toolbar.Content>
          </Toolbar>
        </NavigationStack>
      </Host>
    );
  }
  return <EntryForm entry={entry} />;
}

function EntryForm({ entry }: { entry: Entry }) {
  const theme = useTheme();
  const tree = useTree();
  const pickable = usePickableContexts();
  const [contextId, setContextId] = useState<ContextId>(entry.contextId);
  const [start, setStart] = useState(entry.startUtc);
  const [end, setEnd] = useState(entry.endUtc);
  const note = useNativeState(entry.note ?? '');
  const context = tree.byId.get(contextId);
  const options = pickable.some((c) => c.id === contextId) || !context ? pickable : [context, ...pickable];
  const running = end === null;

  const save = () => {
    const patch: EntryPatch = {};
    if (contextId !== entry.contextId) patch.contextId = contextId;
    if (start !== entry.startUtc) patch.startUtc = start;
    if (end !== entry.endUtc) patch.endUtc = end;
    const text = note.get().trim() || null;
    if (text !== entry.note) patch.note = text;
    if (Object.keys(patch).length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      actions.updateEntry(entry.id, patch);
    }
    router.back();
  };

  const remove = () =>
    Alert.alert('Delete this entry?', 'You can undo right after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          actions.deleteEntry(entry.id);
          router.back();
        },
      },
    ]);

  return (
    <Host style={{ flex: 1 }} colorScheme={theme.scheme} seedColor={context ? theme.hue(context.hue).control : undefined}>
      <NavigationStack>
        <Toolbar>
          <Form modifiers={[navigationTitle(running ? 'Running' : 'Entry')]}>
            {context ? (
              <Section>
                <HStack spacing={14}>
                  <Text modifiers={[font({ size: 40 })]}>{context.glyph ?? '•'}</Text>
                  <VStack alignment="leading" spacing={2}>
                    <Text modifiers={[font({ size: 20, weight: 'semibold' }), lineLimit(1)]}>{context.name}</Text>
                    {context.ancestors.length ? (
                      <Text modifiers={[font({ textStyle: 'subheadline' }), secondary, lineLimit(1)]}>
                        {context.ancestors.map((a) => a.name).join(' › ')}
                      </Text>
                    ) : null}
                  </VStack>
                  <Spacer />
                  <Duration start={start} end={end} />
                </HStack>
              </Section>
            ) : null}
            <Section title="Context">
              <Picker
                label="Context"
                selection={contextId}
                onSelectionChange={(value: string) => setContextId(value as ContextId)}
                modifiers={[pickerStyle('menu')]}>
                {options.map((c) => (
                  <Text key={c.id} modifiers={[tag(c.id)]}>
                    {`${c.glyph ? `${c.glyph} ` : ''}${pathLabel(c)}`}
                  </Text>
                ))}
              </Picker>
            </Section>
            <Section title="Time" footer={<Text>Changing the time trims any entry it overlaps.</Text>}>
              <DatePicker
                title="Starts"
                selection={new Date(start)}
                range={{ end: new Date(end ?? Date.now()) }}
                displayedComponents={['date', 'hourAndMinute']}
                onDateChange={(date) => setStart(date.getTime())}
              />
              {running ? (
                <HStack>
                  <Text>Ends</Text>
                  <Spacer />
                  <Button label="Stop Now" systemImage="stop.fill" onPress={() => setEnd(Date.now())} />
                </HStack>
              ) : (
                <DatePicker
                  title="Ends"
                  selection={new Date(end)}
                  range={{ start: new Date(start), end: new Date() }}
                  displayedComponents={['date', 'hourAndMinute']}
                  onDateChange={(date) => setEnd(date.getTime())}
                />
              )}
            </Section>
            <Section title="Note">
              <TextField text={note} placeholder="What were you doing?" axis="vertical" modifiers={[lineLimit(6)]} />
            </Section>
            <Section>
              <Button role="destructive" label="Delete Entry" systemImage="trash" onPress={remove} />
            </Section>
          </Form>
          <Toolbar.Content>
            <ToolbarItem placement="cancellationAction">
              <Button role="close" onPress={() => router.back()} />
            </ToolbarItem>
            <ToolbarItem placement="confirmationAction">
              <Button label="Done" systemImage="checkmark" onPress={save} />
            </ToolbarItem>
          </Toolbar.Content>
        </Toolbar>
      </NavigationStack>
    </Host>
  );
}
