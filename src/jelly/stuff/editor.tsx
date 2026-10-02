// What both platforms' jelly editors share: which jelly the route asks for, the draft with
// its suggestions, and the candy header of a new jelly. Edits to an existing jelly apply as
// you go (the name when you leave the field); a new one is drafted and made with `create`.
//   /jelly/context?id=…         edit
//   /jelly/context?parent=…     new jelly inside another
//   /jelly/context[?pin=1]      new top-level jelly

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import {
  actions,
  type ContextId,
  DEFAULT_HUE,
  DEFAULT_NUDGE_MINUTES,
  type Hue,
  newContextId,
  type ResolvedContext,
  subtreeIds,
  useTree,
} from '@/core';
import { stuffText } from '@/i18n/stuff';

import { Character } from '../Character';
import { saveSuggestedLook } from '../character/suggest';
import type { Look } from '../character/traits';
import { buzz, play } from '../feedback';
import { firstGrapheme } from '../fields';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { useNameSuggestion } from '../suggestions';
import { springs, text, useTheme } from '../theme';

const s = stuffText.editor;

/** One-tap weekly targets and nudges, in minutes; 0 is "none" and "default". */
export const TARGET_CHIPS = [0, 5, 10, 20, 30, 40].map((h) => h * 60);
export const NUDGE_CHIPS = [0, 30, 60, 120, 180];

export interface EditorTarget {
  context: ResolvedContext | null;
  initialParent: ContextId | null;
  /** New jellies only: start pinned. */
  pin: boolean;
}

/** The jelly the route asks for, or null when the one to edit is gone. */
export function useEditorTarget(): EditorTarget | null {
  const params = useLocalSearchParams<{
    id?: string;
    parent?: string;
    pin?: string;
  }>();
  const tree = useTree();
  const existing = params.id ? (tree.ordered.find((c) => c.id === params.id) ?? null) : null;
  if (params.id && !existing) return null;
  const parent = existing ? null : (tree.ordered.find((c) => c.id === params.parent) ?? null);
  return {
    context: existing,
    initialParent: existing ? existing.parentId : (parent?.id ?? null),
    pin: params.pin === '1' || (!existing && !parent),
  };
}

export function useJellyDraft({ context, initialParent, pin }: EditorTarget) {
  const tree = useTree();
  // A new jelly's preview uses the id it will be created with, so its look doesn't change on Add.
  const [draftId] = useState(newContextId);
  const [name, setName] = useState(context?.name ?? '');
  const [emoji, setEmoji] = useState<string | null>(context?.emoji ?? null);
  // A new jelly's emoji and color stay open to suggestions until they're touched.
  const [emojiTouched, setEmojiTouched] = useState(context !== null);
  const [colorTouched, setColorTouched] = useState(context !== null);
  const [color, setColor] = useState<Hue | null>(context ? context.color : initialParent ? null : 'pink');
  const [parentId, setParentId] = useState<ContextId | null>(initialParent);
  const [pinned, setPinned] = useState(context ? context.pinPosition !== null : pin);
  const [target, setTarget] = useState<number | null>(context?.weeklyTargetMinutes ?? null);
  const [nudge, setNudge] = useState<number | null>(context?.nudgeAfterMinutes ?? null);

  // Only top-level jellies get a suggested color; inside a group they share the parent's.
  const suggested = useNameSuggestion(context ? '' : name, parentId, emojiTouched ? emoji : null, !colorTouched && parentId === null);
  const suggestedEmoji = !emojiTouched ? (suggested?.suggestion.emoji ?? null) : null;
  const shownEmoji = suggestedEmoji ?? emoji;
  const suggestedHue = !colorTouched && parentId === null ? (suggested?.suggestion.hue ?? null) : null;
  const shownColor = suggestedHue ?? color;

  const parent = parentId ? (tree.byId.get(parentId) ?? null) : null;
  const hue: Hue = shownColor ?? parent?.hue ?? DEFAULT_HUE;
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
    jiggle();
    if (context) actions.updateContext(context.id, { emoji: value });
  };

  /** Typed into the emoji field: the first emoji counts, nothing clears it. */
  const typeEmoji = (typed: string) => {
    setEmojiTouched(true);
    const next = firstGrapheme(typed) || null;
    setEmoji(next);
    if (context) actions.updateContext(context.id, { emoji: next });
  };

  const pickColor = (value: Hue | null) => {
    buzz.tick();
    setColorTouched(true);
    setColor(value);
    jiggle();
    if (context) actions.updateContext(context.id, { color: value });
  };

  const moveTo = (next: ContextId | null) => {
    setParentId(next);
    if (context) actions.moveContext(context.id, next);
  };

  const pinTo = (on: boolean) => {
    setPinned(on);
    if (context) (on ? actions.pin : actions.unpin)(context.id);
  };

  const changeTarget = (next: number | null) => {
    setTarget(next);
    if (context) actions.updateContext(context.id, { weeklyTargetMinutes: next });
  };

  const changeNudge = (next: number | null) => {
    setNudge(next);
    if (context) actions.updateContext(context.id, { nudgeAfterMinutes: next });
  };

  const create = () => {
    const typed = name.trim();
    if (!typed) return buzz.warn();
    const id = actions.createContext({
      id: draftId,
      name: typed,
      parentId,
      color: shownColor,
      emoji: shownEmoji,
      pinned,
    });
    if (target !== null || nudge !== null)
      actions.updateContext(id, {
        weeklyTargetMinutes: target,
        nudgeAfterMinutes: nudge,
      });
    if (suggested && suggested.forName === typed) saveSuggestedLook(id, suggested.suggestion, typed, glyph);
    buzz.success();
    play('pop');
    router.back();
  };

  // A new jelly is a draft previewed in the header; an existing one shows its Look editor,
  // whose live jelly follows every edit since they apply at once.
  const draft: PreviewJelly = { id: draftId, hue, glyph, name: name.trim() };
  const title = context ? context.name : parent ? s.newIn(parent.name) : s.newJelly;

  return {
    name,
    setName,
    saveName,
    emoji,
    shownEmoji,
    suggestedEmoji,
    pickEmoji,
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
  };
}

/** The candy header of a new jelly: the live draft, its name and where it will live. */
export function Header({
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
  /** The suggested look, shown on the preview before it's saved. */
  look?: Look;
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
        {suggested ? s.suggested(subtitle) : subtitle}
      </Text>
    </View>
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
