// The jelly editor: a native form under a candy header with the live jelly, then its Look
// (the characters' own editor), name, emoji, color, place in the tree, goals, start link
// and archive/delete. Edits to an existing jelly apply as you go (the name when you leave
// the field); a new one is drafted and made with "Add".
//   /jelly/context?id=…         edit
//   /jelly/context?parent=…     new jelly inside another
//   /jelly/context[?pin=1]      new top-level jelly

import {
  Button,
  HStack,
  Image,
  LabeledContent,
  Picker,
  ScrollView,
  Section,
  Spacer,
  Stepper,
  Text as SwiftText,
  TextField,
  Toggle,
  useNativeState,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  monospacedDigit,
  onTapGesture,
  pickerStyle,
  shapes,
  tag,
  textSelection,
} from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import {
  actions,
  type ContextId,
  DEFAULT_HUE,
  DEFAULT_NUDGE_MINUTES,
  formatDuration,
  type Hue,
  hues,
  MINUTE,
  newContextId,
  pathLabel,
  type ResolvedContext,
  startLink,
  subtreeIds,
  useTree,
} from '@/core';

import { Character } from '../Character';
import { LookEditor } from '../character/LookEditor';
import { saveSuggestedLook, type Suggestion, suggestForContext, useModelAvailable } from '../character/suggest';
import { buzz, play } from '../feedback';
import { EMOJI_SUGGESTIONS, firstGrapheme } from '../fields';
import { HostedRow, JellyForm } from '../forms';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { suggestInput, useNameSuggestion } from '../suggestions';
import { springs, text, useTheme } from '../theme';
import { confirmDelete } from './StuffScreen';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const ROOT = 'root';

export function ContextEditor() {
  const params = useLocalSearchParams<{
    id?: string;
    parent?: string;
    pin?: string;
  }>();
  const tree = useTree();
  const existing = params.id ? (tree.ordered.find((c) => c.id === params.id) ?? null) : null;
  if (params.id && !existing) {
    return (
      <JellyForm title="Jelly">
        <Section>
          <SwiftText modifiers={[secondary]}>This jelly no longer exists.</SwiftText>
        </Section>
      </JellyForm>
    );
  }
  const parent = existing ? null : (tree.ordered.find((c) => c.id === params.parent) ?? null);
  return (
    <Editor
      key={existing?.id ?? 'new'}
      context={existing}
      initialParent={existing ? existing.parentId : (parent?.id ?? null)}
      pin={params.pin === '1' || (!existing && !parent)}
    />
  );
}

interface EditorProps {
  context: ResolvedContext | null;
  initialParent: ContextId | null;
  /** New jellies only: start pinned. */
  pin: boolean;
}

function Editor({ context, initialParent, pin }: EditorProps) {
  const t = useTheme();
  const tree = useTree();
  const nameState = useNativeState(context?.name ?? '');
  const emojiState = useNativeState(context?.emoji ?? '');
  // A new jelly's preview uses the id it will be created with, so its look doesn't change on Add.
  const [draftId] = useState(newContextId);
  const [name, setName] = useState(context?.name ?? '');
  const [emoji, setEmoji] = useState<string | null>(context?.emoji ?? null);
  // A new jelly's emoji stays open to suggestions until it's touched.
  const [emojiTouched, setEmojiTouched] = useState(context !== null);
  const [color, setColor] = useState<Hue | null>(context ? context.color : initialParent ? null : 'pink');
  const [parentId, setParentId] = useState<ContextId | null>(initialParent);
  const [pinned, setPinned] = useState(context ? context.pinPosition !== null : pin);
  const [target, setTarget] = useState<number | null>(context?.weeklyTargetMinutes ?? null);
  const [nudge, setNudge] = useState<number | null>(context?.nudgeAfterMinutes ?? null);

  const suggested = useNameSuggestion(context ? '' : name, parentId, !emojiTouched);
  const suggestedEmoji = !emojiTouched ? (suggested?.suggestion.emoji ?? null) : null;
  const shownEmoji = suggestedEmoji ?? emoji;
  useEffect(() => {
    if (suggestedEmoji) emojiState.set(suggestedEmoji);
  }, [emojiState, suggestedEmoji]);

  const parent = parentId ? (tree.byId.get(parentId) ?? null) : null;
  const hue: Hue = color ?? parent?.hue ?? DEFAULT_HUE;
  const c = t.candy[hue];
  const glyph = shownEmoji ?? parent?.glyph ?? null;
  const inheritedNudge = parent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES;
  const excluded = context ? subtreeIds(tree, context.id) : new Set<ContextId>();
  const parents = tree.ordered.filter((p) => !p.hidden && !excluded.has(p.id));

  // An existing jelly keeps its typed name when the sheet goes away mid-edit.
  const latestName = useRef(name);
  useEffect(() => {
    latestName.current = name;
  }, [name]);
  useEffect(() => {
    if (!context) return;
    const id = context.id;
    const original = context.name;
    return () => {
      const typed = latestName.current.trim();
      if (typed && typed !== original) actions.updateContext(id, { name: typed });
    };
    // Only on unmount of this jelly's editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.id]);

  const bump = useSharedValue(0);
  const jiggle = () => bump.set(withSequence(withTiming(0.2, { duration: 70 }), withSpring(0, springs.wobble)));

  const saveName = () => {
    const typed = name.trim();
    if (context && typed && typed !== context.name) actions.updateContext(context.id, { name: typed });
  };

  const pickEmoji = (value: string | null) => {
    buzz.tick();
    setEmojiTouched(true);
    setEmoji(value);
    emojiState.set(value ?? '');
    jiggle();
    if (context) actions.updateContext(context.id, { emoji: value });
  };

  const pickColor = (value: Hue | null) => {
    buzz.tick();
    setColor(value);
    jiggle();
    if (context) actions.updateContext(context.id, { color: value });
  };

  const create = () => {
    const typed = name.trim();
    if (!typed) return buzz.warn();
    const id = actions.createContext({
      id: draftId,
      name: typed,
      parentId,
      color,
      emoji: shownEmoji,
      pinned,
    });
    if (target !== null || nudge !== null)
      actions.updateContext(id, {
        weeklyTargetMinutes: target,
        nudgeAfterMinutes: nudge,
      });
    if (suggested && suggested.forName === typed) saveSuggestedLook(id, suggested.suggestion, typed);
    buzz.success();
    play('pop');
    router.back();
  };

  // A new jelly is a draft previewed in the header; an existing one shows its Look editor,
  // whose live jelly follows every edit since they apply at once.
  const draft: PreviewJelly = { id: draftId, hue, glyph, name: name.trim() };
  const title = context ? context.name : parent ? `New in ${parent.name}` : 'New Jelly';

  return (
    <JellyForm
      title={title}
      tint={c.ink}
      cancel={context ? null : { label: 'Cancel', onPress: () => router.back() }}
      confirm={context ? { label: 'Done', onPress: () => router.back() } : { label: 'Add', onPress: create, disabled: !name.trim() }}>
      {context ? (
        <HostedRow
          render={(width) => (
            <View style={{ width }}>
              <LookEditor context={context} />
            </View>
          )}
        />
      ) : (
        <HostedRow
          color={c.tint}
          render={(width) => (
            <Header
              width={width}
              jelly={draft}
              look={suggested?.suggestion.look}
              title={name.trim() || 'New jelly'}
              bump={bump}
              subtitle={parent ? `in ${pathLabel(parent)}` : 'Top level'}
              suggested={suggestedEmoji !== null}
            />
          )}
        />
      )}

      <Section title="Name">
        <TextField
          text={nameState}
          placeholder="e.g. Deep work"
          autoFocus={!context}
          maxLength={40}
          onTextChange={setName}
          onFocusChange={(focused) => !focused && saveName()}
        />
      </Section>

      <Section
        title="Emoji"
        footer={
          <SwiftText>
            {suggestedEmoji
              ? 'Suggested for the name. Pick another any time.'
              : parent && !emoji
                ? `Uses ${parent.name}'s emoji when empty.`
                : 'Type any emoji, or pick one.'}
          </SwiftText>
        }>
        <LabeledContent label={suggestedEmoji ? 'Emoji ✨' : 'Emoji'}>
          <HStack spacing={12}>
            {context ? <SuggestButton context={context} name={name} parentId={parentId} onEmoji={pickEmoji} /> : null}
            <TextField
              text={emojiState}
              placeholder={parent?.glyph ?? 'None'}
              onTextChange={(typed) => {
                setEmojiTouched(true);
                const next = firstGrapheme(typed) || null;
                setEmoji(next);
                if (context) actions.updateContext(context.id, { emoji: next });
              }}
              modifiers={[frame({ width: 56 })]}
            />
          </HStack>
        </LabeledContent>
        <ScrollView axes="horizontal" showsIndicators={false}>
          <HStack spacing={6}>
            {EMOJI_SUGGESTIONS.map((e) => (
              <SwiftText
                key={e}
                modifiers={[
                  font({ size: 26 }),
                  frame({ width: 44, height: 44 }),
                  ...(shownEmoji === e ? [background(c.tint, shapes.circle())] : []),
                  onTapGesture(() => pickEmoji(shownEmoji === e && !suggestedEmoji ? null : e)),
                ]}>
                {e}
              </SwiftText>
            ))}
          </HStack>
        </ScrollView>
      </Section>

      <Section title="Color">
        {parentId ? (
          <Toggle
            label={`Same as ${parent?.name ?? 'parent'}`}
            isOn={color === null}
            onIsOnChange={(on) => pickColor(on ? null : (parent?.hue ?? 'pink'))}
          />
        ) : null}
        {color !== null || !parentId ? <Swatches value={color} onChange={pickColor} /> : null}
      </Section>

      <Section title="Place">
        <Picker
          label="Inside"
          selection={parentId ?? ROOT}
          onSelectionChange={(value: string) => {
            const next = value === ROOT ? null : (parents.find((p) => p.id === value)?.id ?? null);
            setParentId(next);
            if (context) actions.moveContext(context.id, next);
          }}
          modifiers={[pickerStyle('menu')]}>
          <SwiftText modifiers={[tag(ROOT)]}>Top level</SwiftText>
          {parents.map((p) => (
            <SwiftText key={p.id} modifiers={[tag(p.id)]}>
              {`${p.glyph ? `${p.glyph} ` : ''}${pathLabel(p)}`}
            </SwiftText>
          ))}
        </Picker>
        {context?.hidden ? null : (
          <Toggle
            label="Pinned to Now"
            systemImage="pin"
            isOn={pinned}
            onIsOnChange={(on) => {
              setPinned(on);
              if (context) (on ? actions.pin : actions.unpin)(context.id);
            }}
          />
        )}
      </Section>

      <Section
        title="Goals"
        footer={<SwiftText>The target counts this jelly and everything inside it. The nudge asks whether you forgot to stop.</SwiftText>}>
        <Toggle
          label="Weekly target"
          systemImage="target"
          isOn={target !== null}
          onIsOnChange={(on) => {
            const next = on ? (context?.weeklyTargetMinutes ?? 10 * 60) : null;
            setTarget(next);
            if (context) actions.updateContext(context.id, { weeklyTargetMinutes: next });
          }}
        />
        {target !== null ? (
          <Stepper
            label={`${formatDuration(target * MINUTE)} a week`}
            value={target}
            step={60}
            min={60}
            max={100 * 60}
            onValueChange={(next) => {
              setTarget(next);
              if (context)
                actions.updateContext(context.id, {
                  weeklyTargetMinutes: next,
                });
            }}
            modifiers={[monospacedDigit()]}
          />
        ) : null}
        <Toggle
          label="Own nudge"
          systemImage="bell.badge"
          isOn={nudge !== null}
          onIsOnChange={(on) => {
            const next = on ? inheritedNudge : null;
            setNudge(next);
            if (context) actions.updateContext(context.id, { nudgeAfterMinutes: next });
          }}
        />
        {nudge !== null ? (
          <Stepper
            label={`Nudge after ${formatDuration(nudge * MINUTE)}`}
            value={nudge}
            step={15}
            min={15}
            max={12 * 60}
            onValueChange={(next) => {
              setNudge(next);
              if (context) actions.updateContext(context.id, { nudgeAfterMinutes: next });
            }}
            modifiers={[monospacedDigit()]}
          />
        ) : (
          <LabeledContent label="Nudges after">
            <SwiftText modifiers={[secondary, monospacedDigit()]}>
              {`${formatDuration(inheritedNudge * MINUTE)}${parent ? `, from ${parent.name}` : ''}`}
            </SwiftText>
          </LabeledContent>
        )}
      </Section>

      {context ? <ExistingSections context={context} /> : null}
    </JellyForm>
  );
}

/** The candy header of a new jelly: the live draft, its name and where it will live. */
function Header({
  width,
  jelly,
  look,
  title,
  bump,
  subtitle,
  suggested,
}: {
  width: number;
  jelly: PreviewJelly;
  /** Suggested traits shown on the preview before they're saved. */
  look?: Suggestion['look'];
  title: string;
  bump: SharedValue<number>;
  subtitle: string;
  suggested: boolean;
}) {
  const t = useTheme();
  const face = useFace('awake');
  useLively(face, true);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 - bump.get() }, { scaleX: 1 + bump.get() * 0.8 }],
  }));
  return (
    <View style={[styles.header, { width }]}>
      <Animated.View style={[{ transformOrigin: 'bottom' }, style]}>
        <Character context={jelly} size={116} face={face} look={look} />
      </Animated.View>
      <Text style={[text.title2, styles.headerName, { color: t.c.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[text.footnote, { color: t.c.muted }]} numberOfLines={1}>
        {suggested ? `✨ suggested · ${subtitle}` : subtitle}
      </Text>
    </View>
  );
}

/** Asks the on-device model again. Shown only when it's available. */
function SuggestButton({
  context,
  name,
  parentId,
  onEmoji,
}: {
  context: ResolvedContext;
  name: string;
  parentId: ContextId | null;
  onEmoji: (emoji: string) => void;
}) {
  const available = useModelAvailable();
  const [busy, setBusy] = useState(false);
  if (!available) return null;
  return (
    <Button
      label={busy ? 'Thinking…' : 'Suggest'}
      systemImage="sparkles"
      onPress={() => {
        const typed = name.trim() || context.name;
        setBusy(true);
        suggestForContext({
          ...suggestInput(typed, parentId, context.id, true),
          emoji: context.emoji,
        })
          .then((suggestion) => {
            if (!suggestion) return;
            if (suggestion.emoji) onEmoji(suggestion.emoji);
            saveSuggestedLook(context.id, suggestion, typed);
          })
          .catch(() => {})
          .finally(() => setBusy(false));
      }}
    />
  );
}

/** Twelve candy drops in two rows. */
function Swatches({ value, onChange }: { value: Hue | null; onChange: (hue: Hue) => void }) {
  const t = useTheme();
  return (
    <VStack spacing={12}>
      {[hues.slice(0, 6), hues.slice(6)].map((row, r) => (
        <HStack key={r} spacing={12}>
          {row.map((h) => {
            const c = t.candy[h];
            return (
              <ZStack
                key={h}
                modifiers={[
                  frame({ width: 38, height: 38 }),
                  background(
                    {
                      type: 'linearGradient',
                      colors: [c.light, c.fill, c.deep],
                      startPoint: { x: 0.3, y: 0 },
                      endPoint: { x: 0.7, y: 1 },
                    },
                    shapes.circle(),
                  ),
                  onTapGesture(() => onChange(h)),
                ]}>
                {value === h ? <Image systemName="checkmark" size={15} color={c.on} /> : null}
              </ZStack>
            );
          })}
          <Spacer />
        </HStack>
      ))}
    </VStack>
  );
}

function ExistingSections({ context }: { context: ResolvedContext }) {
  const [copied, setCopied] = useState(false);
  const link = startLink(context.id);
  return (
    <>
      <Section title="Start link" footer={<SwiftText>Open it from Shortcuts, the Action Button or Siri to switch to this jelly.</SwiftText>}>
        <SwiftText modifiers={[font({ textStyle: 'footnote', design: 'monospaced' }), secondary, textSelection(true)]}>{link}</SwiftText>
        <Button
          label={copied ? 'Copied' : 'Copy Link'}
          systemImage={copied ? 'checkmark' : 'link'}
          onPress={() => {
            Clipboard.setStringAsync(link);
            buzz.success();
            setCopied(true);
          }}
        />
      </Section>
      <Section
        footer={
          <SwiftText>
            {context.archivedAt
              ? 'Archived jellies stay in history and reports.'
              : 'Archiving hides it from Now and the pickers. Its time stays in reports.'}
          </SwiftText>
        }>
        {context.hidden ? null : (
          <Button
            label="Add Jelly Inside"
            systemImage="plus"
            onPress={() =>
              router.push({
                pathname: '/jelly/context',
                params: { parent: context.id },
              })
            }
          />
        )}
        <Button
          label={context.archivedAt ? 'Unarchive' : 'Archive'}
          systemImage={context.archivedAt ? 'tray.and.arrow.up' : 'archivebox'}
          onPress={() => {
            buzz.thud();
            if (context.archivedAt) actions.unarchive(context.id);
            else {
              actions.archive(context.id);
              router.back();
            }
          }}
        />
        <Button role="destructive" label="Delete Jelly" systemImage="trash" onPress={() => confirmDelete(context, () => router.back())} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerName: { marginTop: 4 },
});
