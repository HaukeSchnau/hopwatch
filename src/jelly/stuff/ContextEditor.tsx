// The jelly editor: a native form under a candy header with the live jelly, then its Look
// (the characters' own editor), name, emoji, color, place in the tree, goals, start link
// and archive/delete. The draft and the route are shared with Android (editor.tsx);
// Android's form is ContextEditor.android.tsx.

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
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { actions, type ContextId, formatDuration, type Hue, hues, MINUTE, pathLabel, type ResolvedContext, startLink } from '@/core';
import { stuffText } from '@/i18n/stuff';

import { lookFor } from '../character/derive';
import { LookEditor } from '../character/LookEditor';
import { saveSuggestedLook, suggestForContext, useModelAvailable } from '../character/suggest';
import { buzz } from '../feedback';
import { EMOJI_SUGGESTIONS } from '../fields';
import { HostedRow, JellyForm } from '../forms';
import { suggestInput } from '../suggestions';
import { useTheme } from '../theme';
import { type EditorTarget, Header, NUDGE_CHIPS, TARGET_CHIPS, useEditorTarget, useJellyDraft } from './editor';
import { confirmDelete } from './StuffScreen';

const s = stuffText.editor;
const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const ROOT = 'root';

export function ContextEditor() {
  const target = useEditorTarget();
  if (!target) {
    return (
      <JellyForm title={s.title}>
        <Section>
          <SwiftText modifiers={[secondary]}>{s.gone}</SwiftText>
        </Section>
      </JellyForm>
    );
  }
  return <Editor key={target.context?.id ?? 'new'} {...target} />;
}

function Editor(props: EditorTarget) {
  const { context } = props;
  const t = useTheme();
  const {
    name,
    setName,
    saveName,
    emoji,
    shownEmoji,
    suggestedEmoji,
    pickEmoji: pickDraftEmoji,
    typeEmoji,
    color,
    shownColor,
    suggestedHue,
    pickColor,
    parentId,
    parent,
    parents,
    moveTo,
    pinned,
    pinTo,
    target,
    changeTarget,
    nudge,
    changeNudge,
    inheritedNudge,
    hue,
    suggested,
    draft,
    title,
    bump,
    create,
  } = useJellyDraft(props);
  const nameState = useNativeState(context?.name ?? '');
  const emojiState = useNativeState(context?.emoji ?? '');
  useEffect(() => {
    if (suggestedEmoji) emojiState.set(suggestedEmoji);
  }, [emojiState, suggestedEmoji]);
  const c = t.candy[hue];

  const pickEmoji = (value: string | null) => {
    pickDraftEmoji(value);
    emojiState.set(value ?? '');
  };

  return (
    <JellyForm
      title={title}
      tint={c.ink}
      cancel={context ? null : { label: stuffText.cancel, onPress: () => router.back() }}
      confirm={context ? { label: s.done, onPress: () => router.back() } : { label: s.add, onPress: create, disabled: !name.trim() }}>
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
              look={suggested ? lookFor(draft, suggested.suggestion) : undefined}
              title={name.trim() || s.unnamed}
              bump={bump}
              subtitle={parent ? s.inside(pathLabel(parent)) : s.topLevel}
              suggested={suggestedEmoji !== null || suggestedHue !== null}
            />
          )}
        />
      )}

      <Section title={s.name}>
        <TextField
          text={nameState}
          placeholder={s.namePlaceholder}
          autoFocus={!context}
          maxLength={40}
          onTextChange={setName}
          onFocusChange={(focused) => !focused && saveName()}
        />
      </Section>

      <Section
        title={s.emoji}
        footer={<SwiftText>{suggestedEmoji ? s.emojiSuggestedFooter : parent && !emoji ? s.emojiInherited(parent.name) : s.emojiFooter}</SwiftText>}>
        <LabeledContent label={suggestedEmoji ? s.emojiSuggested : s.emoji}>
          <HStack spacing={12}>
            {context ? <SuggestButton context={context} name={name} parentId={parentId} onEmoji={pickEmoji} /> : null}
            <TextField
              text={emojiState}
              placeholder={parent?.glyph ?? s.emojiNone}
              onTextChange={typeEmoji}
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

      <Section title={suggestedHue ? s.colorSuggested : s.color} footer={suggestedHue ? <SwiftText>{s.colorSuggestedFooter}</SwiftText> : undefined}>
        {parentId ? (
          <Toggle
            label={s.sameAs(parent?.name ?? null)}
            isOn={color === null}
            onIsOnChange={(on) => pickColor(on ? null : (parent?.hue ?? 'pink'))}
          />
        ) : null}
        {shownColor !== null || !parentId ? <Swatches value={shownColor} onChange={pickColor} /> : null}
      </Section>

      <Section title={s.place}>
        <Picker
          label={s.insidePicker}
          selection={parentId ?? ROOT}
          onSelectionChange={(value: string) => moveTo(value === ROOT ? null : (parents.find((p) => p.id === value)?.id ?? null))}
          modifiers={[pickerStyle('menu')]}>
          <SwiftText modifiers={[tag(ROOT)]}>{s.topLevel}</SwiftText>
          {parents.map((p) => (
            <SwiftText key={p.id} modifiers={[tag(p.id)]}>
              {`${p.glyph ? `${p.glyph} ` : ''}${pathLabel(p)}`}
            </SwiftText>
          ))}
        </Picker>
        {context?.hidden ? null : (
          <Toggle
            label={s.pinned}
            systemImage="pin"
            isOn={pinned}
            onIsOnChange={pinTo}
          />
        )}
      </Section>

      <Section title={s.target} footer={<SwiftText>{s.targetFooter}</SwiftText>}>
        <Chips
          options={TARGET_CHIPS}
          none={s.targetNone}
          value={target}
          onChange={changeTarget}
        />
        {target !== null ? (
          <Stepper
            label={s.perWeek(formatDuration(target * MINUTE))}
            value={target}
            step={60}
            min={60}
            max={100 * 60}
            onValueChange={changeTarget}
            modifiers={[monospacedDigit()]}
          />
        ) : null}
      </Section>

      <Section title={s.nudge} footer={<SwiftText>{s.nudgeFooter}</SwiftText>}>
        <Chips
          options={NUDGE_CHIPS}
          none={s.nudgeDefault}
          value={nudge}
          onChange={changeNudge}
        />
        {nudge !== null ? (
          <Stepper
            label={s.nudgeAfter(formatDuration(nudge * MINUTE))}
            value={nudge}
            step={15}
            min={15}
            max={12 * 60}
            onValueChange={changeNudge}
            modifiers={[monospacedDigit()]}
          />
        ) : (
          <LabeledContent label={s.nudgesAfter}>
            <SwiftText modifiers={[secondary, monospacedDigit()]}>{s.inheritedFrom(formatDuration(inheritedNudge * MINUTE), parent?.name ?? null)}</SwiftText>
          </LabeledContent>
        )}
      </Section>

      {context ? <ExistingSections context={context} /> : null}
    </JellyForm>
  );
}

/**
 * One-tap minutes as a native segmented control. Option 0 reads `none` and means null; a
 * value set with the stepper that isn't an option leaves every segment unselected.
 */
function Chips({ options, none, value, onChange }: { options: number[]; none: string; value: number | null; onChange: (minutes: number | null) => void }) {
  return (
    <Picker
      selection={value ?? 0}
      onSelectionChange={(picked: number) => {
        buzz.tick();
        onChange(picked === 0 ? null : picked);
      }}
      modifiers={[pickerStyle('segmented')]}>
      {options.map((m) => (
        <SwiftText key={m} modifiers={[tag(m)]}>
          {m === 0 ? none : s.chip(m)}
        </SwiftText>
      ))}
    </Picker>
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
      label={busy ? s.thinking : s.suggest}
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
            saveSuggestedLook(context.id, suggestion, typed, suggestion.emoji ?? context.glyph);
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
      <Section title={s.startLink} footer={<SwiftText>{s.startLinkFooter}</SwiftText>}>
        <SwiftText modifiers={[font({ textStyle: 'footnote', design: 'monospaced' }), secondary, textSelection(true)]}>{link}</SwiftText>
        <Button
          label={copied ? s.copied : s.copyLink}
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
          <SwiftText>{context.archivedAt ? s.archivedFooter : s.archiveFooter}</SwiftText>
        }>
        {context.hidden ? null : (
          <Button
            label={s.addInside}
            systemImage="plus"
            onPress={() =>
              router.push({
                pathname: '/context',
                params: { parent: context.id },
              })
            }
          />
        )}
        <Button
          label={context.archivedAt ? stuffText.unarchive : stuffText.archive}
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
        <Button role="destructive" label={s.delete} systemImage="trash" onPress={() => confirmDelete(context, () => router.back())} />
      </Section>
    </>
  );
}
