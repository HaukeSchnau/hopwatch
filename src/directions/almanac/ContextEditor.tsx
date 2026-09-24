// The context editor, as a clean form in the Almanac's type: name, filing (parent and
// order), mark and ink, pin, weekly target, nudge, deep link, archive and delete.
// Existing contexts save as you go; a new one is created with one button.

import { MenuView } from '@expo/ui/community/menu';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  type ContextId,
  type ContextTree,
  DEFAULT_NUDGE_MINUTES,
  type Hue,
  hues,
  pathLabel,
  type ResolvedContext,
  startLink,
  subtreeIds,
  useContextById,
  useTree,
} from '@/core';

import { goBack, PageHeader } from './PageHeader';
import { Paper } from './Paper';
import { EmojiPicker, InkPicker } from './pickers';
import { font, ink, margin, paper, riso } from './theme';
import { Caps, InkLink, Rule } from './type';

/** "40", "37.5", "37,5" or "37:30" hours → minutes; empty → null. */
function parseHours(text: string): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const clock = t.match(/^(\d+):(\d{1,2})$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 60) : undefined;
}

const formatHours = (minutes: number | null) =>
  minutes === null ? '' : minutes % 60 === 0 ? String(minutes / 60) : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

/** Where a context may be filed: anywhere outside its own subtree, or the top level. */
function parentChoices(tree: ContextTree, id: ContextId | null) {
  const blocked = id ? subtreeIds(tree, id) : new Set<ContextId>();
  return tree.ordered.filter((c) => !blocked.has(c.id) && !c.hidden);
}

function Screen({ children, title, folio }: { children: ReactNode; title: string; folio: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 100, paddingHorizontal: margin }}>
        <PageHeader title={title} folio={folio} backLabel="Index" />
        {children}
      </ScrollView>
    </View>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Caps color={ink.full}>{label}</Caps>
        {note && <Text style={styles.fieldNote}>{note}</Text>}
      </View>
      {children}
    </View>
  );
}

/** A native menu of possible parents, shown as "Filed under Clients › Acme ▾". */
function ParentMenu({
  tree,
  contextId,
  parentId,
  onChange,
}: {
  tree: ContextTree;
  contextId: ContextId | null;
  parentId: ContextId | null;
  onChange: (parentId: ContextId | null) => void;
}) {
  const parent = parentId ? tree.byId.get(parentId) : null;
  const choices = parentChoices(tree, contextId);
  return (
    <MenuView
      title="File under"
      actions={[
        { id: 'root', title: 'Top level', state: parentId === null ? 'on' : 'off' },
        ...choices.map((c) => ({
          id: c.id,
          title: `${c.glyph ? `${c.glyph} ` : ''}${pathLabel(c)}`,
          state: c.id === parentId ? ('on' as const) : ('off' as const),
        })),
      ]}
      onPressAction={({ nativeEvent }) => {
        Haptics.selectionAsync();
        onChange(nativeEvent.event === 'root' ? null : (nativeEvent.event as ContextId));
      }}>
      <View style={styles.menuTrigger}>
        <Text style={styles.menuText} numberOfLines={1}>
          {parent ? `${parent.glyph ? `${parent.glyph} ` : ''}${pathLabel(parent)}` : 'Top level'}
        </Text>
        <Text style={styles.menuCaret}>▾</Text>
      </View>
    </MenuView>
  );
}

export function EditContext({ id }: { id: ContextId }) {
  const context = useContextById(id);
  if (!context) {
    return (
      <Screen title="Gone" folio="p. 4a">
        <Text style={styles.gone}>This entry is no longer in the index.</Text>
        <InkLink onPress={goBack} style={{ alignSelf: 'flex-start', marginTop: 12 }}>
          ‹ Back to the Index
        </InkLink>
      </Screen>
    );
  }
  return (
    <Screen title="Index card" folio="p. 4a">
      <EditBody key={context.id} context={context} />
    </Screen>
  );
}

function EditBody({ context }: { context: ResolvedContext }) {
  const tree = useTree();
  const [name, setName] = useState(context.name);
  const [target, setTarget] = useState(formatHours(context.weeklyTargetMinutes));
  const [nudge, setNudge] = useState(context.nudgeAfterMinutes === null ? '' : String(context.nudgeAfterMinutes));
  const [copied, setCopied] = useState(false);
  const parent = context.parentId ? tree.byId.get(context.parentId) : null;
  const siblings = parent ? parent.childIds : tree.roots;
  const index = siblings.indexOf(context.id);
  const inheritedNudge = parent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES;

  const saveName = () => {
    if (name.trim() && name.trim() !== context.name) actions.updateContext(context.id, { name });
    else setName(context.name);
  };
  const saveTarget = () => {
    const minutes = parseHours(target);
    if (minutes === undefined) return setTarget(formatHours(context.weeklyTargetMinutes));
    actions.updateContext(context.id, { weeklyTargetMinutes: minutes });
    setTarget(formatHours(minutes));
  };
  const saveNudge = () => {
    const t = nudge.trim();
    const minutes = t === '' ? null : Math.round(Number(t));
    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) return setNudge(String(context.nudgeAfterMinutes ?? ''));
    actions.updateContext(context.id, { nudgeAfterMinutes: minutes });
  };

  const remove = () =>
    Alert.alert(`Strike ${context.name} from the index?`, 'A context with entries or sub-entries is archived instead, so the record stays intact.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Strike it',
        style: 'destructive',
        onPress: () => {
          const result = actions.deleteContext(context.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (result === 'deleted') goBack();
          else Alert.alert('Archived instead', `${context.name} has history, so it was archived. It stays in the reports.`);
        },
      },
    ]);

  return (
    <View>
      <TextInput
          selectionColor={ink.red}
        value={name}
        onChangeText={setName}
        onEndEditing={saveName}
        returnKeyType="done"
        style={[styles.nameInput, { borderBottomColor: riso[context.hue].fill }]}
        accessibilityLabel="Name"
      />

      <Field label="Filed under">
        <ParentMenu
          tree={tree}
          contextId={context.id}
          parentId={context.parentId}
          onChange={(parentId) => parentId !== context.parentId && actions.moveContext(context.id, parentId)}
        />
        {siblings.length > 1 && (
          <View style={styles.order}>
            <Text style={styles.orderText}>
              {index + 1} of {siblings.length} in {parent ? parent.name : 'the top level'}
            </Text>
            <InkLink
              disabled={index <= 0}
              textStyle={styles.orderLink}
              onPress={() => actions.moveContext(context.id, context.parentId, index - 1)}
              accessibilityLabel="Move earlier">
              ↑ earlier
            </InkLink>
            <InkLink
              disabled={index >= siblings.length - 1}
              textStyle={styles.orderLink}
              onPress={() => actions.moveContext(context.id, context.parentId, index + 1)}
              accessibilityLabel="Move later">
              ↓ later
            </InkLink>
          </View>
        )}
      </Field>

      <Field label="Mark" note={context.emoji === null && context.glyph ? `inherits ${context.glyph}` : undefined}>
        <EmojiPicker
          value={context.emoji}
          onChange={(emoji) => actions.updateContext(context.id, { emoji })}
          inheritLabel={parent ? `Inherit ${parent.glyph ?? ''}`.trim() : undefined}
        />
      </Field>

      <Field label="Ink">
        <InkPicker
          value={context.color}
          onChange={(color) => actions.updateContext(context.id, { color })}
          inheritHue={parent?.hue}
        />
      </Field>

      <Rule style={styles.sectionRule} />

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Caps color={ink.full}>On the front page</Caps>
          <Text style={styles.switchNote}>
            {context.hidden ? 'Archived contexts can’t be pinned.' : 'Pinned words keep their place on the board.'}
          </Text>
        </View>
        <Switch
          value={context.pinPosition !== null}
          disabled={context.hidden}
          trackColor={{ true: ink.full, false: paper.well }}
          onValueChange={(on) => {
            Haptics.selectionAsync();
            if (on) actions.pin(context.id);
            else actions.unpin(context.id);
          }}
        />
      </View>

      <Field label="Weekly target" note="applies to everything filed under it">
        <View style={styles.numberRow}>
          <TextInput
          selectionColor={ink.red}
            value={target}
            onChangeText={setTarget}
            onEndEditing={saveTarget}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
            placeholder="none"
            placeholderTextColor={ink.faint}
            style={styles.numberInput}
            accessibilityLabel="Weekly target in hours"
          />
          <Text style={styles.unit}>hours a week</Text>
        </View>
      </Field>

      <Field label="Nudge after" note="a reminder if the clock runs this long">
        <View style={styles.numberRow}>
          <TextInput
          selectionColor={ink.red}
            value={nudge}
            onChangeText={setNudge}
            onEndEditing={saveNudge}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder={String(inheritedNudge)}
            placeholderTextColor={ink.faint}
            style={styles.numberInput}
            accessibilityLabel="Nudge after minutes"
          />
          <Text style={styles.unit}>
            minutes{context.nudgeAfterMinutes === null ? `, inherited from ${parent ? parent.name : 'the default'}` : ''}
          </Text>
        </View>
      </Field>

      <Field label="Shortcut link" note="for the Shortcuts app, Siri or the Action Button">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy the start link"
          onPress={async () => {
            await Clipboard.setStringAsync(startLink(context.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}>
          <Text style={styles.linkText} numberOfLines={2}>
            {startLink(context.id)}
          </Text>
          <Caps color={ink.full}>{copied ? 'Copied ✓' : 'Copy'}</Caps>
        </Pressable>
      </Field>

      <Rule style={styles.sectionRule} />
      <View style={styles.danger}>
        <InkLink
          textStyle={styles.dangerLink}
          onPress={() => {
            Haptics.selectionAsync();
            if (context.archivedAt === null) actions.archive(context.id);
            else actions.unarchive(context.id);
          }}>
          {context.archivedAt === null ? 'Archive' : 'Unarchive'}
        </InkLink>
        <InkLink textStyle={styles.dangerLink} color={ink.red} onPress={remove}>
          Strike from the index
        </InkLink>
      </View>
      {context.archivedAt !== null && (
        <Text style={styles.switchNote}>Archived: gone from the pickers, still in the reports and the record.</Text>
      )}
    </View>
  );
}

/** The first unused ink among the roots, so new top-level contexts look distinct. */
function freshHue(tree: ContextTree): Hue {
  const used = new Set(tree.roots.map((id) => tree.byId.get(id)?.color));
  return hues.find((h) => h !== 'gray' && !used.has(h)) ?? 'gray';
}

export function NewContext({ parentId: initialParent, pinned: initialPinned = false }: { parentId: ContextId | null; pinned?: boolean }) {
  const tree = useTree();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<ContextId | null>(
    initialParent && tree.byId.has(initialParent) ? initialParent : null,
  );
  const [emoji, setEmoji] = useState<string | null>(null);
  const [hue, setHue] = useState<Hue | null>(() => (parentId ? null : freshHue(tree)));
  const [pinned, setPinned] = useState(initialPinned);
  const parent = parentId ? tree.byId.get(parentId) : null;
  const shown = hue ?? parent?.hue ?? 'gray';
  const ready = name.trim().length > 0;

  const create = () => {
    if (!ready) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.createContext({ name, parentId, emoji, color: hue, pinned });
    goBack();
  };

  return (
    <Screen title="New card" folio="p. 4b">
      <TextInput
          selectionColor={ink.red}
        value={name}
        onChangeText={setName}
        placeholder="Name it"
        placeholderTextColor={ink.faint}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
        style={[styles.nameInput, { borderBottomColor: riso[shown].fill }]}
        accessibilityLabel="Name"
      />
      <Field label="Filed under">
        <ParentMenu
          tree={tree}
          contextId={null}
          parentId={parentId}
          onChange={(next) => {
            setParentId(next);
            if (next && hue === freshHue(tree)) setHue(null);
          }}
        />
      </Field>
      <Field label="Mark">
        <EmojiPicker value={emoji} onChange={setEmoji} inheritLabel={parent ? `Inherit ${parent.glyph ?? ''}`.trim() : undefined} />
      </Field>
      <Field label="Ink">
        <InkPicker value={hue} onChange={setHue} inheritHue={parent?.hue} />
      </Field>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Caps color={ink.full}>On the front page</Caps>
          <Text style={styles.switchNote}>Pin it to the board of words.</Text>
        </View>
        <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: ink.full, false: paper.well }} />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={create}
        style={({ pressed }) => [styles.primary, !ready && { opacity: 0.35 }, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>Add to the index</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    marginTop: 18,
    fontFamily: font.displayItalic,
    fontSize: 40,
    color: ink.full,
    paddingVertical: 4,
    borderBottomWidth: 3,
  },
  field: { marginTop: 24 },
  fieldHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  fieldNote: { flexShrink: 1, fontFamily: font.textItalic, fontSize: 14, color: ink.soft, textAlign: 'right' },
  menuTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: ink.full,
    backgroundColor: paper.sheet,
  },
  menuText: { flexShrink: 1, fontFamily: font.display, fontSize: 22, color: ink.full },
  menuCaret: { fontFamily: font.sans, fontSize: 14, color: ink.soft },
  order: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  orderText: { flex: 1, fontFamily: font.textItalic, fontSize: 15, color: ink.soft },
  orderLink: { fontSize: 18 },
  sectionRule: { marginTop: 28 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22 },
  switchNote: { marginTop: 2, fontFamily: font.textItalic, fontSize: 14, color: ink.soft },
  numberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  numberInput: {
    width: 96,
    minHeight: 48,
    fontFamily: font.display,
    fontSize: 34,
    color: ink.full,
    borderBottomWidth: 1.5,
    borderBottomColor: ink.full,
    fontVariant: ['tabular-nums'],
  },
  unit: { flexShrink: 1, fontFamily: font.textItalic, fontSize: 16, color: ink.soft },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: paper.slip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ink.full,
  },
  linkText: { flex: 1, fontFamily: font.sansRegular, fontSize: 12, color: ink.soft },
  danger: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  dangerLink: { fontSize: 21 },
  gone: { marginTop: 24, fontFamily: font.display, fontSize: 32, color: ink.full },
  primary: { marginTop: 28, minHeight: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: ink.full },
  primaryText: { fontFamily: font.displayItalic, fontSize: 26, color: paper.sheet },
});
