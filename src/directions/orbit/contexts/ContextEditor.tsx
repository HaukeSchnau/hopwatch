import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  actions,
  type ContextId,
  DEFAULT_NUDGE_MINUTES,
  type Hue,
  pathLabel,
  type ResolvedContext,
  startLink,
  subtreeIds,
  useStint,
  useTree,
} from '@/core';

import { ContextPicker } from '../ContextPicker';
import { EmojiPicker, fieldStyles, HuePicker } from '../pickers';
import { SheetHeader } from '../sheet';
import { alpha, font, neon, sky } from '../theme';
import { Label, PillButton, Toggle } from '../ui';

interface Draft {
  name: string;
  emoji: string | null;
  color: Hue | null;
  parentId: ContextId | null;
  pinned: boolean;
  /** Hours per week as typed, e.g. "40" or "7.5". */
  target: string;
  /** Minutes as typed; empty inherits. */
  nudge: string;
}

const hoursText = (minutes: number | null) => (minutes === null ? '' : String(Math.round((minutes / 60) * 100) / 100));
const parseHours = (text: string) => {
  const hours = Number.parseFloat(text.replace(',', '.'));
  return Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null;
};
const parseMinutes = (text: string) => {
  const minutes = Number.parseInt(text, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

/**
 * Creates or edits a context: name, emoji, color, parent, pin, weekly target, nudge,
 * its deep link, archive and delete. `id` is "new" for a new context, with an
 * optional `parent`.
 */
export function ContextEditor() {
  const params = useLocalSearchParams<{ id: string; parent?: string }>();
  const tree = useTree();
  const existing = [...tree.byId.values()].find((c) => c.id === params.id) ?? null;
  const parentParam = [...tree.byId.values()].find((c) => c.id === params.parent) ?? null;
  if (params.id !== 'new' && !existing) return <SheetHeader title="Context gone" />;
  return <Editor key={existing?.id ?? 'new'} existing={existing} parent={existing ? null : parentParam} />;
}

function Editor({ existing, parent }: { existing: ResolvedContext | null; parent: ResolvedContext | null }) {
  const tree = useTree();
  const hasEntries = useStint((s) => (existing ? s.entries.some((e) => e.contextId === existing.id) : false));
  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          name: existing.name,
          emoji: existing.emoji,
          color: existing.color,
          parentId: existing.parentId,
          pinned: existing.pinPosition !== null,
          target: hoursText(existing.weeklyTargetMinutes),
          nudge: existing.nudgeAfterMinutes === null ? '' : String(existing.nudgeAfterMinutes),
        }
      : { name: '', emoji: null, color: parent ? null : 'teal', parentId: parent?.id ?? null, pinned: false, target: '', nudge: '' },
  );
  const [movingOpen, setMovingOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const draftParent = draft.parentId ? (tree.byId.get(draft.parentId) ?? null) : null;
  const hue: Hue = draft.color ?? draftParent?.hue ?? 'gray';
  const color = neon[hue];
  const glyph = draft.emoji ?? draftParent?.glyph ?? null;
  const inheritedNudge = draftParent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES;
  const excluded = existing ? subtreeIds(tree, existing.id) : undefined;
  const canSave = draft.name.trim().length > 0;

  /** Writes the draft; returns the context's id. */
  const save = (): ContextId | null => {
    if (!canSave) return null;
    const weeklyTargetMinutes = parseHours(draft.target);
    const nudgeAfterMinutes = parseMinutes(draft.nudge);
    if (!existing) {
      const id = actions.createContext({ name: draft.name, parentId: draft.parentId, color: draft.color, emoji: draft.emoji, pinned: draft.pinned });
      if (weeklyTargetMinutes !== null || nudgeAfterMinutes !== null) actions.updateContext(id, { weeklyTargetMinutes, nudgeAfterMinutes });
      return id;
    }
    actions.updateContext(existing.id, { name: draft.name, emoji: draft.emoji, color: draft.color, weeklyTargetMinutes, nudgeAfterMinutes });
    if (draft.parentId !== existing.parentId) actions.moveContext(existing.id, draft.parentId);
    if (!existing.hidden && draft.pinned !== (existing.pinPosition !== null)) {
      if (draft.pinned) actions.pin(existing.id);
      else actions.unpin(existing.id);
    }
    return existing.id;
  };

  const done = () => {
    if (!save()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const canDelete = !hasEntries && existing.childIds.length === 0;
    Alert.alert(
      canDelete ? `Delete ${existing.name}?` : `Archive ${existing.name}?`,
      canDelete
        ? 'It has no entries, so it goes away completely.'
        : 'It has history or children, so it is archived instead of deleted. Reports keep its time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: canDelete ? 'Delete' : 'Archive',
          style: 'destructive',
          onPress: () => {
            actions.deleteContext(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  // The header stays put above the scrolling form, so Save is always one tap away.
  return (
    <View style={{ flex: 1 }}>
      <SheetHeader
        kicker={existing ? 'Edit context' : draftParent ? `Inside ${draftParent.name}` : 'New context'}
        title={draft.name.trim() || (existing ? existing.name : 'Untitled')}
        left={<HeaderButton title="Cancel" onPress={() => router.back()} />}
        right={<HeaderButton title={existing ? 'Save' : 'Create'} onPress={done} strong disabled={!canSave} />}
      />
      <ScrollView
        style={styles.form}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingBottom: 48 }}>

        <View style={styles.preview}>
          <View style={[styles.orb, { borderColor: alpha(color, 0.95), backgroundColor: alpha(color, 0.25), shadowColor: color }]}>
            {glyph ? <Text style={{ fontSize: 34 }}>{glyph}</Text> : <Text style={[styles.initial, { color }]}>{draft.name.slice(0, 1).toUpperCase()}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <TextInput
            value={draft.name}
            onChangeText={(name) => set({ name })}
            placeholder="Name"
            placeholderTextColor={sky.faint}
            keyboardAppearance="dark"
            autoFocus={!existing}
            returnKeyType="done"
            style={fieldStyles.input}
            accessibilityLabel="Name"
          />
        </View>

        <Section label={draft.emoji === null && draftParent?.glyph ? `Emoji · inherits ${draftParent.glyph}` : 'Emoji'}>
          <EmojiPicker value={draft.emoji} onChange={(emoji) => set({ emoji })} />
        </Section>

        <Section label={draft.color === null ? `Color · inherits ${draftParent?.name ?? ''}` : 'Color'}>
          <HuePicker value={draft.color} onChange={(c) => set({ color: c })} inherited={draftParent?.hue} />
        </Section>

        <Section label="Inside">
          <Pressable onPress={() => setMovingOpen((o) => !o)} style={styles.rowButton} accessibilityRole="button">
            <SymbolView name="arrow.turn.down.right" size={15} tintColor={sky.dim} />
            <Text style={styles.rowText} numberOfLines={1}>
              {draftParent ? pathLabel(draftParent) : 'Top level'}
            </Text>
            <Text style={styles.link}>{movingOpen ? 'Close' : 'Move'}</Text>
          </Pressable>
          {movingOpen && (
            <View style={styles.moveList}>
              <Pressable
                onPress={() => {
                  set({ parentId: null, color: draft.color ?? hue });
                  setMovingOpen(false);
                }}
                style={styles.topLevel}>
                <SymbolView name="circle.dashed" size={20} tintColor={sky.dim} />
                <Text style={styles.rowText}>Top level</Text>
                {draft.parentId === null && <SymbolView name="checkmark" size={14} tintColor={sky.accent} weight="bold" />}
              </Pressable>
              <ContextPicker
                selectedId={draft.parentId}
                exclude={excluded}
                onPick={(next) => {
                  set({ parentId: next.id });
                  setMovingOpen(false);
                }}
              />
            </View>
          )}
        </Section>

        <View style={styles.card}>
          {!existing?.hidden && (
            <View style={styles.switchRow}>
              <SymbolView name="pin" size={16} tintColor={sky.dim} />
              <Text style={styles.rowText}>Pin to home</Text>
              <Toggle value={draft.pinned} onChange={(pinned) => set({ pinned })} color={color} accessibilityLabel="Pin to home" />
            </View>
          )}
          <View style={styles.divider} />
          <NumberRow
            icon="target"
            label="Weekly target"
            unit="h / week"
            value={draft.target}
            placeholder="none"
            decimal
            onChange={(target) => set({ target })}
          />
          <View style={styles.divider} />
          <NumberRow
            icon="bell.badge"
            label="Nudge after"
            unit="min"
            value={draft.nudge}
            placeholder={`${inheritedNudge}`}
            onChange={(nudge) => set({ nudge })}
          />
        </View>
        <Text style={styles.footnote}>
          The target covers everything inside this context. The nudge is a reminder when an entry runs longer; empty inherits{' '}
          {inheritedNudge} min.
        </Text>

        {existing && (
          <>
            <Section label="Deep link">
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(startLink(existing.id));
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setCopied(true);
                }}
                style={styles.linkRow}
                accessibilityRole="button"
                accessibilityLabel="Copy start link">
                <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                  {startLink(existing.id)}
                </Text>
                <Text style={styles.link}>{copied ? 'Copied' : 'Copy'}</Text>
              </Pressable>
              <Text style={styles.footnote}>Open it from Shortcuts, the Action Button or an automation to switch here.</Text>
            </Section>

            <View style={styles.actions}>
              {!existing.hidden && (
                <PillButton
                  title="Add inside"
                  icon="plus"
                  onPress={() => {
                    const id = save();
                    if (id) router.replace({ pathname: '/orbit/context/[id]', params: { id: 'new', parent: id } });
                  }}
                />
              )}
              {existing.archivedAt === null ? (
                <PillButton
                  title="Archive"
                  icon="archivebox"
                  tone={sky.warn}
                  onPress={() => {
                    actions.archive(existing.id);
                    router.back();
                  }}
                />
              ) : (
                <PillButton
                  title="Unarchive"
                  icon="tray.and.arrow.up"
                  tone={sky.warn}
                  onPress={() => {
                    actions.unarchive(existing.id);
                    router.back();
                  }}
                />
              )}
              <PillButton title="Delete" icon="trash" tone={sky.danger} onPress={remove} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Label style={styles.sectionLabel}>{label}</Label>
      {children}
    </View>
  );
}

function HeaderButton({ title, onPress, strong, disabled }: { title: string; onPress: () => void; strong?: boolean; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={styles.headerButton} accessibilityRole="button">
      <Text style={[styles.headerText, strong && { color: sky.accent, fontFamily: font.textBold }, disabled && { opacity: 0.35 }]}>{title}</Text>
    </Pressable>
  );
}

function NumberRow({
  icon,
  label,
  unit,
  value,
  placeholder,
  decimal,
  onChange,
}: {
  icon: 'target' | 'bell.badge';
  label: string;
  unit: string;
  value: string;
  placeholder: string;
  decimal?: boolean;
  onChange: (text: string) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <SymbolView name={icon} size={16} tintColor={sky.dim} />
      <Text style={styles.rowText}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={sky.faint}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        keyboardAppearance="dark"
        style={styles.number}
        accessibilityLabel={label}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, overflow: 'hidden' },
  headerButton: { height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headerText: { fontFamily: font.textMedium, fontSize: 16, color: sky.dim },
  preview: { alignItems: 'center', marginVertical: 12 },
  orb: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  initial: { fontFamily: font.display, fontSize: 30 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { marginLeft: 6, marginBottom: 8 },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rowText: { flex: 1, fontFamily: font.textMedium, fontSize: 15.5, color: sky.text },
  link: { fontFamily: font.textBold, fontSize: 14, color: sky.accent },
  moveList: { marginTop: 8, marginHorizontal: -16 },
  topLevel: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 24 },
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: sky.hairlineHi, marginLeft: 44 },
  number: {
    minWidth: 64,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    textAlign: 'right',
    fontFamily: font.mono,
    fontSize: 16,
    color: sky.text,
  },
  unit: { width: 64, fontFamily: font.mono, fontSize: 11, color: sky.dim },
  footnote: { marginHorizontal: 22, marginTop: 8, marginBottom: 16, fontFamily: font.text, fontSize: 12.5, lineHeight: 18, color: sky.faint },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  linkText: { flex: 1, fontFamily: font.mono, fontSize: 12, color: sky.dim },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingHorizontal: 16, marginTop: 4 },
});
