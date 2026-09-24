import {
  Button,
  Form,
  Host,
  HStack,
  Image,
  LabeledContent,
  NavigationStack,
  Picker,
  ScrollView,
  Section,
  Spacer,
  Stepper,
  Text,
  TextField,
  Toggle,
  Toolbar,
  ToolbarItem,
  useNativeState,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  navigationTitle,
  onTapGesture,
  pickerStyle,
  shapes,
  tag,
  textSelection,
} from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  actions,
  type ContextId,
  DEFAULT_NUDGE_MINUTES,
  formatDuration,
  type Hue,
  hues,
  MINUTE,
  pathLabel,
  type ResolvedContext,
  startLink,
  subtreeIds,
  useEntries,
  useTree,
} from '@/core';

import { EMOJI_SUGGESTIONS, firstGrapheme } from '../pickers';
import { useTheme } from '../theme';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const ROOT = 'root';

/**
 * The context editor, as a native form: name, emoji, color, parent, pin, weekly target
 * and nudge, plus the Shortcuts link and archive/delete. `id=new` creates one, under
 * `parent` when given. Everything applies on Done.
 */
export function ContextSheet() {
  const { id, parent } = useLocalSearchParams<{ id: string; parent?: string }>();
  const tree = useTree();
  const context = id === 'new' ? null : (tree.byId.get(id as ContextId) ?? null);
  if (id !== 'new' && !context) {
    return (
      <Host style={{ flex: 1 }}>
        <NavigationStack>
          <Toolbar>
            <Form modifiers={[navigationTitle('Context')]}>
              <Text modifiers={[secondary]}>This context no longer exists.</Text>
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
  const parentId = context ? context.parentId : parent && tree.byId.has(parent as ContextId) ? (parent as ContextId) : null;
  return <ContextForm key={id} context={context} initialParent={parentId} />;
}

function ContextForm({ context, initialParent }: { context: ResolvedContext | null; initialParent: ContextId | null }) {
  const theme = useTheme();
  const tree = useTree();
  const entries = useEntries();
  const nameState = useNativeState(context?.name ?? '');
  const emojiState = useNativeState(context?.emoji ?? '');
  const [name, setName] = useState(context?.name ?? '');
  const [emoji, setEmoji] = useState<string | null>(context?.emoji ?? null);
  const [color, setColor] = useState<Hue | null>(context ? context.color : initialParent ? null : 'blue');
  const [parentId, setParentId] = useState<ContextId | null>(initialParent);
  const [pinned, setPinned] = useState(context ? context.pinPosition !== null : true);
  const [target, setTarget] = useState<number | null>(context?.weeklyTargetMinutes ?? null);
  const [nudge, setNudge] = useState<number | null>(context?.nudgeAfterMinutes ?? null);
  const [copied, setCopied] = useState(false);

  const parent = parentId ? tree.byId.get(parentId) : undefined;
  const resolvedHue: Hue = color ?? parent?.hue ?? 'gray';
  const hueColors = theme.hue(resolvedHue);
  const glyph = emoji ?? parent?.glyph ?? null;
  const inheritedNudge = parent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES;
  const excluded = context ? subtreeIds(tree, context.id) : new Set<ContextId>();
  const parents = tree.ordered.filter((c) => !c.hidden && !excluded.has(c.id));
  const deletable = context !== null && context.childIds.length === 0 && !entries.some((e) => e.contextId === context.id);
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    const trimmed = nameState.get().trim() || name.trim();
    if (!context) {
      const id = actions.createContext({ name: trimmed, parentId, color, emoji, pinned });
      if (target !== null || nudge !== null) actions.updateContext(id, { weeklyTargetMinutes: target, nudgeAfterMinutes: nudge });
    } else {
      actions.updateContext(context.id, { name: trimmed, color, emoji, weeklyTargetMinutes: target, nudgeAfterMinutes: nudge });
      if (parentId !== context.parentId) actions.moveContext(context.id, parentId);
      if (pinned !== (context.pinPosition !== null)) (pinned ? actions.pin : actions.unpin)(context.id);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const pickEmoji = (value: string) => {
    Haptics.selectionAsync();
    const next = emoji === value ? null : value;
    setEmoji(next);
    emojiState.set(next ?? '');
  };

  const archive = () => {
    if (!context) return;
    if (context.archivedAt) actions.unarchive(context.id);
    else actions.archive(context.id);
    router.back();
  };

  const remove = () => {
    if (!context) return;
    Alert.alert(`Delete ${context.name}?`, 'It has no entries, so nothing else changes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          actions.deleteContext(context.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Host style={{ flex: 1 }} colorScheme={theme.scheme} seedColor={hueColors.control}>
      <NavigationStack>
        <Toolbar>
          <Form modifiers={[navigationTitle(context ? 'Edit Context' : 'New Context')]}>
            <Section>
              <HStack spacing={14}>
                <ZStack modifiers={[frame({ width: 56, height: 56 }), background(hueColors.solid, shapes.circle())]}>
                  <Text modifiers={[font({ size: 30 })]}>{glyph ?? '✨'}</Text>
                </ZStack>
                <VStack alignment="leading" spacing={2}>
                  <Text modifiers={[font({ size: 22, weight: 'bold' }), lineLimit(1)]}>{name.trim() || 'New context'}</Text>
                  <Text modifiers={[font({ textStyle: 'subheadline' }), secondary, lineLimit(1)]}>
                    {parent ? `in ${pathLabel(parent)}` : 'Top level'}
                  </Text>
                </VStack>
                <Spacer />
              </HStack>
            </Section>

            <Section title="Name">
              <TextField text={nameState} placeholder="e.g. Deep work" autoFocus={!context} onTextChange={setName} />
            </Section>

            <Section title="Emoji" footer={<Text>{parent && !emoji ? `Uses ${parent.name}’s emoji when empty.` : 'Type any emoji, or pick one.'}</Text>}>
              <LabeledContent label="Emoji">
                <TextField
                  text={emojiState}
                  placeholder={parent?.glyph ?? 'None'}
                  onTextChange={(text) => setEmoji(firstGrapheme(text) || null)}
                  modifiers={[frame({ width: 80 })]}
                />
              </LabeledContent>
              <ScrollView axes="horizontal" showsIndicators={false}>
                <HStack spacing={6}>
                  {EMOJI_SUGGESTIONS.map((e) => (
                    <Text
                      key={e}
                      modifiers={[
                        font({ size: 26 }),
                        frame({ width: 44, height: 44 }),
                        ...(emoji === e ? [background(theme.fill, shapes.circle())] : []),
                        onTapGesture(() => pickEmoji(e)),
                      ]}>
                      {e}
                    </Text>
                  ))}
                </HStack>
              </ScrollView>
            </Section>

            <Section title="Color">
              {parentId ? (
                <Toggle
                  label={`Same as ${parent?.name ?? 'parent'}`}
                  isOn={color === null}
                  onIsOnChange={(on) => setColor(on ? null : (parent?.hue ?? 'blue'))}
                />
              ) : null}
              {color !== null || !parentId ? (
                <VStack spacing={12}>
                  {[hues.slice(0, 6), hues.slice(6)].map((row, r) => (
                    <HStack key={r} spacing={12}>
                      {row.map((h) => {
                        const c = theme.hue(h);
                        return (
                          <ZStack
                            key={h}
                            modifiers={[
                              frame({ width: 38, height: 38 }),
                              background(c.solid, shapes.circle()),
                              onTapGesture(() => {
                                Haptics.selectionAsync();
                                setColor(h);
                              }),
                            ]}>
                            {color === h ? <Image systemName="checkmark" size={15} color={c.onSolid} /> : null}
                          </ZStack>
                        );
                      })}
                    </HStack>
                  ))}
                </VStack>
              ) : null}
            </Section>

            <Section title="Placement">
              <Picker
                label="Parent"
                selection={parentId ?? ROOT}
                onSelectionChange={(value: string) => setParentId(value === ROOT ? null : (value as ContextId))}
                modifiers={[pickerStyle('menu')]}>
                <Text modifiers={[tag(ROOT)]}>None (top level)</Text>
                {parents.map((c) => (
                  <Text key={c.id} modifiers={[tag(c.id)]}>
                    {`${c.glyph ? `${c.glyph} ` : ''}${pathLabel(c)}`}
                  </Text>
                ))}
              </Picker>
              <Toggle label="Pinned on Now" systemImage="pin" isOn={pinned} onIsOnChange={setPinned} />
            </Section>

            <Section
              title="Goals"
              footer={<Text>The target counts this context and everything inside it. The reminder asks whether you forgot to stop.</Text>}>
              <Toggle
                label="Weekly target"
                systemImage="target"
                isOn={target !== null}
                onIsOnChange={(on) => setTarget(on ? (context?.weeklyTargetMinutes ?? 40 * 60) : null)}
              />
              {target !== null ? (
                <Stepper
                  label={`${formatDuration(target * MINUTE)} per week`}
                  value={target}
                  step={30}
                  min={30}
                  max={100 * 60}
                  onValueChange={setTarget}
                  modifiers={[monospacedDigit()]}
                />
              ) : null}
              <Toggle
                label="Custom reminder"
                systemImage="bell.badge"
                isOn={nudge !== null}
                onIsOnChange={(on) => setNudge(on ? inheritedNudge : null)}
              />
              {nudge !== null ? (
                <Stepper
                  label={`Remind after ${formatDuration(nudge * MINUTE)}`}
                  value={nudge}
                  step={15}
                  min={15}
                  max={12 * 60}
                  onValueChange={setNudge}
                  modifiers={[monospacedDigit()]}
                />
              ) : (
                <LabeledContent label="Reminds after">
                  <Text modifiers={[secondary, monospacedDigit()]}>
                    {`${formatDuration(inheritedNudge * MINUTE)}${parent ? `, from ${parent.name}` : ''}`}
                  </Text>
                </LabeledContent>
              )}
            </Section>

            {context ? (
              <Section title="Shortcut" footer={<Text>Open this link from the Shortcuts app, the Action Button or an automation to switch here.</Text>}>
                <Text modifiers={[font({ textStyle: 'footnote', design: 'monospaced' }), secondary, textSelection(true)]}>
                  {startLink(context.id)}
                </Text>
                <Button
                  label={copied ? 'Copied' : 'Copy Link'}
                  systemImage={copied ? 'checkmark' : 'link'}
                  onPress={() => {
                    Clipboard.setStringAsync(startLink(context.id));
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setCopied(true);
                  }}
                />
              </Section>
            ) : null}

            {context ? (
              <Section
                footer={
                  <Text>
                    {context.archivedAt
                      ? 'Archived contexts stay in history and reports.'
                      : 'Archiving hides it from pickers. Its history stays in reports.'}
                  </Text>
                }>
                <Button
                  label={context.archivedAt ? 'Unarchive' : 'Archive'}
                  systemImage={context.archivedAt ? 'tray.and.arrow.up' : 'archivebox'}
                  onPress={archive}
                />
                {deletable ? <Button role="destructive" label="Delete Context" systemImage="trash" onPress={remove} /> : null}
              </Section>
            ) : null}
          </Form>
          <Toolbar.Content>
            <ToolbarItem placement="cancellationAction">
              <Button role="close" onPress={() => router.back()} />
            </ToolbarItem>
            <ToolbarItem placement="confirmationAction">
              <Button label={context ? 'Done' : 'Add'} systemImage="checkmark" onPress={save} />
            </ToolbarItem>
          </Toolbar.Content>
        </Toolbar>
      </NavigationStack>
    </Host>
  );
}
