// The jelly editor sheet. Edits apply as you go for an existing jelly (the name when
// you leave the field); a new one is drafted and made with "Make it".
//   /jelly1/context?id=…         edit
//   /jelly1/context?parent=…     new jelly inside another
//   /jelly1/context[?pin=1]      new top-level jelly

import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import {
  actions,
  DEFAULT_HUE,
  DEFAULT_NUDGE_MINUTES,
  formatDuration,
  type Hue,
  MINUTE,
  pathLabel,
  type ResolvedContext,
  startLink,
  useTree,
} from '@/core';

import { Character } from '../Character';
import { buzz, play } from '../feedback';
import { EmojiField, HuePicker, Stepper } from '../fields';
import { useFace, useLively } from '../Gummy';
import { candy, colors, fonts, springs } from '../theme';
import { inkCandy, JellyButton, JellySwitch, Squishy } from '../ui';
import { confirmDelete } from './StuffScreen';

interface Draft {
  name: string;
  emoji: string | null;
  color: Hue | null;
  pinned: boolean;
  targetHours: number | null;
  nudge: number | null;
}

export function ContextEditor() {
  const params = useLocalSearchParams<{ id?: string; parent?: string; pin?: string }>();
  const tree = useTree();
  const existing = tree.ordered.find((c) => c.id === params.id) ?? null;
  const parent = existing
    ? (existing.ancestors[existing.ancestors.length - 1] ?? null)
    : (tree.ordered.find((c) => c.id === params.parent) ?? null);

  const [draft, setDraft] = useState<Draft>(() =>
    existing
      ? {
          name: existing.name,
          emoji: existing.emoji,
          color: existing.color,
          pinned: existing.pinPosition !== null,
          targetHours: existing.weeklyTargetMinutes === null ? null : Math.round(existing.weeklyTargetMinutes / 60),
          nudge: existing.nudgeAfterMinutes,
        }
      : { name: '', emoji: null, color: parent ? null : 'pink', pinned: params.pin === '1' || !parent, targetHours: null, nudge: null },
  );

  const face = useFace('awake');
  useLively(face, true);
  const jiggle = useSharedValue(0);
  const bounce = () => jiggle.set(withSequence(withTiming(0.2, { duration: 70 }), withSpring(0, springs.wobble)));
  const blobStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - jiggle.get() }, { scaleX: 1 + jiggle.get() * 0.8 }] }));

  // Saves the name of an existing jelly when the sheet goes away mid-edit.
  const latestName = useRef(draft.name);
  useEffect(() => {
    latestName.current = draft.name;
  }, [draft.name]);
  useEffect(() => {
    if (!existing) return;
    const id = existing.id;
    const original = existing.name;
    return () => {
      const name = latestName.current.trim();
      if (name && name !== original) actions.updateContext(id, { name });
    };
    // Only on unmount of this jelly's editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  const hue: Hue = draft.color ?? parent?.hue ?? DEFAULT_HUE;
  const glyph = draft.emoji ?? parent?.glyph ?? null;
  const inheritedNudge = parent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES;

  const change = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if (!existing) return;
    if ('emoji' in patch) actions.updateContext(existing.id, { emoji: patch.emoji ?? null });
    if ('color' in patch) actions.updateContext(existing.id, { color: patch.color ?? null });
    if ('targetHours' in patch) actions.updateContext(existing.id, { weeklyTargetMinutes: patch.targetHours == null ? null : patch.targetHours * 60 });
    if ('nudge' in patch) actions.updateContext(existing.id, { nudgeAfterMinutes: patch.nudge ?? null });
    if ('pinned' in patch) (patch.pinned ? actions.pin : actions.unpin)(existing.id);
  };

  const saveName = () => {
    const name = draft.name.trim();
    if (existing && name && name !== existing.name) actions.updateContext(existing.id, { name });
  };

  const create = () => {
    const name = draft.name.trim();
    if (!name) return buzz.warn();
    const id = actions.createContext({ name, parentId: parent?.id ?? null, color: draft.color, emoji: draft.emoji, pinned: draft.pinned });
    if (draft.targetHours !== null || draft.nudge !== null) {
      actions.updateContext(id, {
        weeklyTargetMinutes: draft.targetHours === null ? null : draft.targetHours * 60,
        nudgeAfterMinutes: draft.nudge,
      });
    }
    buzz.success();
    play('pop');
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.top}>
        <Animated.View style={[{ transformOrigin: 'bottom' }, blobStyle]}>
          <Character context={{ id: existing?.id ?? 'new-jelly', hue, glyph }} size={112} face={face} dim={existing?.hidden} />
        </Animated.View>
        <Text style={styles.kicker}>{existing ? (existing.hidden ? 'Archived jelly' : 'Edit jelly') : parent ? `New inside ${parent.name}` : 'New jelly'}</Text>
      </View>

      <TextInput
        value={draft.name}
        onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
        onBlur={saveName}
        onSubmitEditing={existing ? saveName : create}
        placeholder="Name"
        placeholderTextColor={colors.faint}
        style={styles.name}
        returnKeyType="done"
        maxLength={40}
        autoFocus={!existing}
      />

      <Label>Emoji</Label>
      <EmojiField
        value={draft.emoji}
        fallback={parent ? parent.glyph : undefined}
        onChange={(emoji) => {
          change({ emoji });
          bounce();
        }}
      />

      <Label>Color</Label>
      <HuePicker
        value={draft.color}
        inherit={parent ? parent.hue : undefined}
        onChange={(color) => {
          change({ color });
          bounce();
        }}
      />

      <View style={[styles.card, { marginTop: 22 }]}>
        {existing && (
          <>
            <Squishy
              amount={0.04}
              onPress={() => router.push({ pathname: '/jelly1/pick', params: { mode: 'parent', id: existing.id } })}
              accessibilityRole="button"
              accessibilityLabel="Move to another parent">
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Inside</Text>
                <View style={styles.rowValue}>
                  <Text style={styles.rowValueText} numberOfLines={1}>
                    {parent ? pathLabel(parent) : 'Top level'}
                  </Text>
                  <SymbolView name="chevron.right" size={13} tintColor={colors.muted} weight="bold" />
                </View>
              </View>
            </Squishy>
            <Divider />
          </>
        )}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Pinned to Now</Text>
          <JellySwitch
            value={draft.pinned}
            disabled={existing?.hidden}
            onValueChange={(pinned) => change({ pinned })}
            color={candy[hue].fill}
            accessibilityLabel="Pinned to Now"
          />
        </View>
      </View>

      <Label hint="Counts everything inside it too">Weekly target</Label>
      <View style={styles.card}>
        <View style={styles.row}>
          <Stepper value={draft.targetHours} onChange={(targetHours) => change({ targetHours })} step={1} min={1} max={100} unit="h" placeholder="No target" start={10} />
        </View>
        <QuickChips options={[5, 10, 20, 30, 40]} unit="h" value={draft.targetHours} hue={hue} onPick={(targetHours) => change({ targetHours })} />
      </View>

      <Label hint="A reminder when it's been running this long">Nudge after</Label>
      <View style={styles.card}>
        <View style={styles.row}>
          <Stepper
            value={draft.nudge}
            onChange={(nudge) => change({ nudge })}
            step={15}
            min={15}
            max={720}
            unit="min"
            placeholder={`${formatDuration(inheritedNudge * MINUTE)} (inherited)`}
            start={inheritedNudge}
          />
        </View>
        <QuickChips options={[30, 60, 120, 180]} unit="min" value={draft.nudge} hue={hue} onPick={(nudge) => change({ nudge })} />
      </View>

      {existing ? <ExistingActions context={existing} /> : <JellyButton label="Make it!" icon="sparkles" hue={hue} size="large" onPress={create} disabled={!draft.name.trim()} style={{ marginTop: 28 }} />}
    </ScrollView>
  );
}

function ExistingActions({ context }: { context: ResolvedContext }) {
  const [copied, setCopied] = useState(false);
  const link = startLink(context.id);
  return (
    <>
      <Label hint="Open it from Shortcuts, the Action Button or Siri">Start link</Label>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.link} numberOfLines={1} ellipsizeMode="middle" selectable>
            {link}
          </Text>
          <Squishy
            onPress={() => {
              Clipboard.setStringAsync(link);
              buzz.success();
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            accessibilityRole="button"
            accessibilityLabel="Copy start link">
            <View style={[styles.copy, copied && { backgroundColor: candy.green.tint }]}>
              <SymbolView name={copied ? 'checkmark' : 'doc.on.doc'} size={14} tintColor={copied ? candy.green.deep : colors.ink} weight="bold" />
              <Text style={[styles.copyText, copied && { color: candy.green.deep }]}>{copied ? 'Copied' : 'Copy'}</Text>
            </View>
          </Squishy>
        </View>
      </View>

      <View style={styles.actions}>
        {!context.hidden && (
          <JellyButton
            label="Add inside"
            icon="plus"
            hue={context.hue}
            size="medium"
            onPress={() => router.push({ pathname: '/jelly1/context', params: { parent: context.id } })}
          />
        )}
        <JellyButton
          label={context.archivedAt ? 'Unarchive' : 'Archive'}
          icon="archivebox"
          palette={inkCandy}
          size="medium"
          onPress={() => {
            buzz.thud();
            if (context.archivedAt) actions.unarchive(context.id);
            else {
              actions.archive(context.id);
              router.back();
            }
          }}
        />
        <Squishy onPress={() => confirmDelete(context, () => router.back())} accessibilityRole="button" style={styles.delete}>
          <SymbolView name="trash" size={16} tintColor={colors.danger} weight="bold" />
          <Text style={styles.deleteText}>Delete</Text>
        </Squishy>
      </View>
    </>
  );
}

function QuickChips({ options, unit, value, hue, onPick }: { options: number[]; unit: string; value: number | null; hue: Hue; onPick: (v: number | null) => void }) {
  return (
    <View style={styles.quick}>
      {options.map((o) => {
        const on = value === o;
        return (
          <Squishy
            key={o}
            amount={0.14}
            onPress={() => onPick(on ? null : o)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o} ${unit}`}>
            <View style={[styles.quickChip, on && { backgroundColor: candy[hue].fill }]}>
              <Text style={[styles.quickText, on && { color: candy[hue].on }]}>
                {o} {unit}
              </Text>
            </View>
          </Squishy>
        );
      })}
    </View>
  );
}

function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{children}</Text>
      {hint ? <Text style={styles.labelHint}>{hint}</Text> : null}
    </View>
  );
}

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 60 },
  top: { alignItems: 'center', marginBottom: 12 },
  kicker: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: 18,
    height: 62,
  },
  labelRow: { marginTop: 22, marginBottom: 10 },
  label: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  labelHint: { fontFamily: fonts.text, fontSize: 13, color: colors.faint, marginTop: 1 },
  card: { backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 58, gap: 12 },
  rowLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  rowValueText: { fontFamily: fonts.textBold, fontSize: 15, color: colors.muted, flexShrink: 1 },
  divider: { height: 1.5, backgroundColor: colors.line },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 14 },
  quickChip: { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: colors.sunken, justifyContent: 'center' },
  quickText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  link: { flex: 1, fontFamily: fonts.textBold, fontSize: 13, color: colors.muted },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.sunken },
  copyText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  actions: { marginTop: 28, gap: 12 },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  deleteText: { fontFamily: fonts.display, fontSize: 17, color: colors.danger },
});
