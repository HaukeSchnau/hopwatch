// The jelly editor on Android: the same draft as iOS (editor.tsx) as Material rows, with
// Jelly's own emoji well and gummy drops from onboarding, filter chips for goals and a
// dropdown for the place in the tree. The on-device model is iOS only, so there's no
// Suggest button.

import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { actions, formatDuration, MINUTE, pathLabel, type ResolvedContext, startLink } from '@/core';
import { stuffText } from '@/i18n/stuff';

import { lookFor } from '../character/derive';
import { LookEditor } from '../character/LookEditor';
import { buzz } from '../feedback';
import { EmojiField, HuePicker } from '../fields';
import { HostedRow, JellyForm } from '../forms';
import { ChoiceChips, FieldRow, PickerRow, Row, Section, sentence, StepperRow, SwitchRow } from '../material';
import { text, useTheme } from '../theme';
import { type EditorTarget, Header, NUDGE_CHIPS, TARGET_CHIPS, useEditorTarget, useJellyDraft } from './editor';
import { confirmDelete } from './StuffScreen';

const s = stuffText.editor;
const ROOT = 'root';

export function ContextEditor() {
  const target = useEditorTarget();
  if (!target) {
    return (
      <JellyForm title={s.title}>
        <Section>
          <Row label={s.gone} />
        </Section>
      </JellyForm>
    );
  }
  return <Editor key={target.context?.id ?? 'new'} {...target} />;
}

function Editor(props: EditorTarget) {
  const { context } = props;
  const t = useTheme();
  const d = useJellyDraft(props);
  const c = t.candy[d.hue];
  const { parent } = d;

  return (
    <JellyForm
      title={d.title}
      tint={c.ink}
      cancel={context ? null : { label: stuffText.cancel, onPress: () => router.back() }}
      confirm={context ? { label: s.done, onPress: () => router.back() } : { label: s.add, onPress: d.create, disabled: !d.name.trim() }}>
      {context ? (
        <HostedRow color="transparent" render={(width) => <View style={{ width }}><LookEditor context={context} /></View>} />
      ) : (
        <HostedRow
          color={c.tint}
          render={(width) => (
            <Header
              width={width}
              jelly={d.draft}
              look={d.suggested ? lookFor(d.draft, d.suggested.suggestion) : undefined}
              title={d.name.trim() || s.unnamed}
              bump={d.bump}
              subtitle={parent ? s.inside(pathLabel(parent)) : s.topLevel}
              suggested={d.suggestedEmoji !== null || d.suggestedHue !== null}
            />
          )}
        />
      )}

      <Section title={s.name}>
        <FieldRow value={d.name} onChangeText={d.setName} onBlur={d.saveName} placeholder={s.namePlaceholder} autoFocus={!context} maxLength={40} />
      </Section>

      <Section
        title={d.suggestedEmoji ? s.emojiSuggested : s.emoji}
        footer={d.suggestedEmoji ? s.emojiSuggestedFooter : parent && !d.emoji ? s.emojiInherited(parent.name) : s.emojiFooter}>
        <View style={styles.padded}>
          <EmojiField
            value={d.shownEmoji}
            suggested={d.suggestedEmoji !== null}
            placeholder={parent?.glyph}
            onChange={d.pickEmoji}
            onClear={() => d.pickEmoji(null)}
          />
        </View>
      </Section>

      <Section title={d.suggestedHue ? s.colorSuggested : s.color} footer={d.suggestedHue ? s.colorSuggestedFooter : undefined}>
        {d.parentId ? (
          <SwitchRow label={s.sameAs(parent?.name ?? null)} value={d.color === null} onChange={(on) => d.pickColor(on ? null : (parent?.hue ?? 'pink'))} />
        ) : null}
        {d.shownColor !== null || !d.parentId ? (
          <View style={styles.padded}>
            <HuePicker value={d.shownColor ?? d.hue} onChange={d.pickColor} />
          </View>
        ) : null}
      </Section>

      <Section title={s.place}>
        <PickerRow
          label={s.insidePicker}
          icon="subdirectory_arrow_right"
          choices={[{ value: ROOT, label: s.topLevel }, ...d.parents.map((p) => ({ value: p.id, label: `${p.glyph ? `${p.glyph} ` : ''}${pathLabel(p)}` }))]}
          value={d.parentId ?? ROOT}
          onChange={(value) => d.moveTo(value === ROOT ? null : (d.parents.find((p) => p.id === value)?.id ?? null))}
        />
        {context?.hidden ? null : <SwitchRow label={s.pinned} icon="keep" value={d.pinned} onChange={d.pinTo} />}
      </Section>

      <Section title={s.target} footer={s.targetFooter}>
        <ChoiceChips
          choices={TARGET_CHIPS.map((m) => ({ value: m, label: m === 0 ? s.targetNone : s.chip(m) }))}
          value={d.target ?? 0}
          onChange={(m) => {
            buzz.tick();
            d.changeTarget(m === 0 ? null : m);
          }}
        />
        {d.target !== null ? (
          <StepperRow label={s.perWeek(formatDuration(d.target * MINUTE))} value={d.target} step={60} min={60} max={100 * 60} onChange={d.changeTarget} />
        ) : null}
      </Section>

      <Section title={s.nudge} footer={s.nudgeFooter}>
        <ChoiceChips
          choices={NUDGE_CHIPS.map((m) => ({ value: m, label: m === 0 ? s.nudgeDefault : s.chip(m) }))}
          value={d.nudge ?? 0}
          onChange={(m) => {
            buzz.tick();
            d.changeNudge(m === 0 ? null : m);
          }}
        />
        {d.nudge !== null ? (
          <StepperRow label={s.nudgeAfter(formatDuration(d.nudge * MINUTE))} value={d.nudge} step={15} min={15} max={12 * 60} onChange={d.changeNudge} />
        ) : (
          <Row label={s.nudgesAfter} detail={s.inheritedFrom(formatDuration(d.inheritedNudge * MINUTE), parent?.name ?? null)} />
        )}
      </Section>

      {context ? <ExistingSections context={context} /> : null}
    </JellyForm>
  );
}

function ExistingSections({ context }: { context: ResolvedContext }) {
  const t = useTheme();
  const [copied, setCopied] = useState(false);
  const link = startLink(context.id);
  return (
    <>
      <Section title={s.startLink} footer={s.startLinkFooter}>
        <Text selectable style={[text.footnote, styles.link, { color: t.c.muted }]}>
          {link}
        </Text>
        <Row
          label={copied ? s.copied : sentence(s.copyLink)}
          icon={copied ? 'check' : 'link'}
          onPress={() => {
            Clipboard.setStringAsync(link);
            buzz.success();
            setCopied(true);
          }}
        />
      </Section>
      <Section footer={context.archivedAt ? s.archivedFooter : s.archiveFooter}>
        {context.hidden ? null : <Row label={sentence(s.addInside)} icon="add" onPress={() => router.push({ pathname: '/context', params: { parent: context.id } })} />}
        <Row
          label={context.archivedAt ? stuffText.unarchive : stuffText.archive}
          icon={context.archivedAt ? 'unarchive' : 'archive'}
          onPress={() => {
            buzz.thud();
            if (context.archivedAt) actions.unarchive(context.id);
            else {
              actions.archive(context.id);
              router.back();
            }
          }}
        />
        <Row label={sentence(s.delete)} icon="delete" destructive onPress={() => confirmDelete(context, () => router.back())} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: 16, paddingVertical: 14 },
  link: { fontFamily: 'monospace', fontWeight: '400', paddingHorizontal: 16, paddingTop: 14 },
});
