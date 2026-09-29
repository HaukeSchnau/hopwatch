// Apple's on-device model as a progressive enhancement for the characters. The model only
// sorts a context into one of the topics in derive.ts (it is good at that and bad at
// abstract picks like body shapes), and the topic brings a fitting topper and neckwear.
// For new contexts it also suggests an emoji. Without the model, nothing here shows up
// and the heuristics in derive.ts do all the work.

import { type Availability, availability, generate } from '@modules/on-device-model';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { actions, type ContextId, type ContextTree, type Json, type ResolvedContext, useStint } from '@/core';

import { emojiKey, topic, type TopicName, topics } from './derive';
import { customKey, parseSuggestion, suggestedKey } from './look';
import { type Look, member, parseLook, traitKeys } from './traits';

export interface SuggestInput {
  name: string;
  /** Names from the root down to the parent, e.g. ["Clients", "Acme"]. */
  ancestors: string[];
  /** Other contexts in the same group, so suggestions stay distinct. */
  siblings: { name: string; emoji: string | null }[];
  /** Ask for an emoji too (only when the user hasn't picked one). */
  wantEmoji: boolean;
  /** The context's own emoji, when it has one; it helps with names that say little. */
  emoji?: string | null;
}

export interface Suggestion {
  /** A single emoji, or null when not asked for or no usable one came back. */
  emoji: string | null;
  /** The traits the model's topic brings: a topper and neckwear, when the topic has them. */
  look: Partial<Look>;
}

type Asked = Extract<(typeof topics)[number], { about: string }>;
const asked = topics.filter((t): t is Asked => 'about' in t);
const choices = [...asked.map((t) => t.name), 'other'] as const;

const INSTRUCTIONS = [
  'You sort activities from a personal time tracker into topics.',
  "Judge by the activity's own name and emoji, and pick the most specific topic.",
  'Its group and the other activities in the group only help when the name alone says nothing, like a client or project name.',
  'Topics:',
  ...asked.map((t) => `${t.name}: ${t.about}`),
  'other: none of these',
].join('\n');

const withEmoji = (input: SuggestInput) => (input.emoji ? `${input.name} ${input.emoji}` : input.name);

function prompt(input: SuggestInput, group: boolean): string {
  const lines: string[] = [];
  if (group && input.ancestors.length > 0) lines.push(`Group: ${input.ancestors.join(' › ')}`);
  if (group && input.siblings.length > 0) lines.push(`Also in the group: ${input.siblings.map((s) => (s.emoji ? `${s.name} ${s.emoji}` : s.name)).join(', ')}`);
  lines.push(`Activity to sort: ${withEmoji(input)}`);
  return lines.join('\n');
}

const topicField = { name: 'topic', description: 'The topic this activity is about.', choices } as const;

async function ask(input: SuggestInput, group: boolean) {
  const taken = input.siblings.flatMap((s) => (s.emoji ? [s.emoji] : []));
  const request = { instructions: INSTRUCTIONS, prompt: prompt(input, group) };
  if (!input.wantEmoji) {
    const answer = await generate({ ...request, fields: [topicField] });
    return answer && { topic: answer.topic, emoji: undefined };
  }
  const emojiField = {
    name: 'emoji',
    description: `One emoji character that shows this activity${taken.length > 0 ? `. Not ${taken.join(' or ')}, those are taken` : ''}.`,
  } as const;
  return generate({ ...request, fields: [emojiField, topicField] });
}

// Code points that start an emoji, and the ones that may follow inside one grapheme.
const PICTOGRAPHIC: readonly (readonly [number, number])[] = [
  [0x1f000, 0x1faff],
  [0x2600, 0x27bf],
  [0x2300, 0x23ff],
  [0x2b00, 0x2bff],
  [0x2190, 0x21ff],
  [0x25a0, 0x25ff],
  [0x2900, 0x297f],
  [0x3030, 0x3030],
  [0x303d, 0x303d],
  [0x3297, 0x3299],
  [0x00a9, 0x00ae],
  [0x203c, 0x2049],
  [0x2122, 0x2139],
];
const inRange = (cp: number) => PICTOGRAPHIC.some(([lo, hi]) => cp >= lo && cp <= hi);
const isModifier = (cp: number) => cp === 0xfe0f || cp === 0xfe0e || cp === 0x20e3 || (cp >= 0x1f3fb && cp <= 0x1f3ff) || (cp >= 0xe0020 && cp <= 0xe007f);
const isFlagHalf = (cp: number) => cp >= 0x1f1e6 && cp <= 0x1f1ff;

/** `text` if it is exactly one emoji (ZWJ sequences and flags included), else null. */
export function singleEmoji(text: string): string | null {
  const trimmed = text.trim();
  const points = [...trimmed].map((c) => c.codePointAt(0) ?? 0);
  if (points.length === 0) return null;
  if (points.length === 2 && points.every(isFlagHalf)) return trimmed;
  let expectBase = true;
  for (const cp of points) {
    if (expectBase) {
      if (!inRange(cp) || isFlagHalf(cp)) return null;
      expectBase = false;
    } else if (cp === 0x200d) expectBase = true;
    else if (!isModifier(cp)) return null;
  }
  return expectBase ? null : trimmed;
}

/** The model's emoji if it's one and not taken, else the topic's first free emoji. */
function pickEmoji(answer: string | undefined, found: TopicName | undefined, siblings: SuggestInput['siblings']): string | null {
  const taken = new Set(siblings.flatMap((s) => (s.emoji ? [emojiKey(s.emoji)] : [])));
  const own = answer ? singleEmoji(answer) : null;
  if (own && !taken.has(emojiKey(own))) return own;
  return (found && topic(found).emoji.find((e) => !taken.has(emojiKey(e)))) || own;
}

/** The traits a topic lends a context: only the meaningful ones. */
function lookOf(found: TopicName | undefined): Partial<Look> {
  if (!found) return {};
  const { topper, neck } = topic(found).look;
  return { ...(topper && { topper }), ...(neck && { neck }) };
}

/**
 * Asks the on-device model for an emoji and look traits. Null when the model is
 * unavailable or failed. If the group trips a guardrail, it asks again without it.
 */
export async function suggestForContext(input: SuggestInput): Promise<Suggestion | null> {
  const answer = (await ask(input, true)) ?? (input.ancestors.length + input.siblings.length > 0 ? await ask(input, false) : null);
  if (!answer) return null;
  const found = member(
    asked.map((t) => t.name),
    answer.topic,
  );
  return {
    emoji: input.wantEmoji ? pickEmoji(answer.emoji, found, input.siblings) : null,
    look: lookOf(found),
  };
}

/** Stores a suggestion as the context's model-picked look (below a custom look). */
export function saveSuggestedLook(contextId: ContextId, suggestion: Suggestion, forName: string): void {
  const look: { [key: string]: Json } = {};
  for (const key of traitKeys) {
    const value = suggestion.look[key];
    if (value !== undefined) look[key] = value;
  }
  actions.setPref(suggestedKey(contextId), { name: forName, look });
}

let known: Availability | null = null;

/** True when Apple's on-device model can answer right now. Rechecks when the app returns. */
export function useModelAvailable(): boolean {
  const [ready, setReady] = useState(known === 'available');
  useEffect(() => {
    let live = true;
    const check = () =>
      availability()
        .catch((): Availability => 'unsupported')
        .then((next) => {
          known = next;
          if (live) setReady(next === 'available');
        });
    void check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && void check());
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return ready;
}

/** What the model hears about an existing context: its name, emoji, group and neighbours. */
export function suggestInputFor(tree: ContextTree, context: ResolvedContext, wantEmoji = false): SuggestInput {
  const siblingIds = context.parentId ? (tree.byId.get(context.parentId)?.childIds ?? []) : tree.roots;
  const siblings = siblingIds
    .filter((id) => id !== context.id)
    .flatMap((id) => {
      const sibling = tree.byId.get(id);
      return sibling && !sibling.hidden ? [{ name: sibling.name, emoji: sibling.glyph }] : [];
    })
    .slice(0, 8);
  return { name: context.name, ancestors: context.ancestors.map((a) => a.name), siblings, wantEmoji, emoji: context.glyph };
}

/** Whether a context still needs model-picked traits for its current name. */
function wantsDressUp(context: ResolvedContext, prefs: Readonly<Record<string, Json>>): boolean {
  const stored = prefs[suggestedKey(context.id)];
  if (stored !== undefined && parseSuggestion(stored)?.name === context.name) return false;
  const custom = prefs[customKey(context.id)];
  const picked = custom === undefined ? undefined : parseLook(custom);
  // Someone already chose both a topper and neckwear by hand: nothing left to dress.
  return !(picked?.topper && picked.neck);
}

// Background requests run one at a time, and each context and name is tried once per launch.
const tried = new Set<string>();
let queue: Promise<void> = Promise.resolve();

async function dressUp(id: ContextId, name: string, key: string) {
  const state = useStint.getState();
  const context = state.tree.byId.get(id);
  // Renamed or gone meanwhile: the new name gets its own turn.
  if (!context || context.name !== name || !wantsDressUp(context, state.prefs)) return;
  if ((await availability().catch(() => 'unsupported')) !== 'available') {
    tried.delete(key);
    return;
  }
  const suggestion = await suggestForContext(suggestInputFor(state.tree, context));
  // A failed answer is stored too (without traits), so it isn't asked again for this name.
  saveSuggestedLook(id, { emoji: null, look: suggestion?.look ?? {} }, name);
}

/**
 * Gives existing contexts model-picked traits in the background, one at a time, and again
 * after a rename. The jelly puts on its new topper with a sparkle (see Gummy). Never
 * touches emojis. Mount once in Jelly's layout.
 */
export function useDressUp(): void {
  const ready = useModelAvailable();
  useEffect(() => {
    if (!ready) return;
    const visit = (tree: ContextTree) => {
      const { prefs } = useStint.getState();
      for (const context of tree.ordered) {
        const key = `${context.id}\n${context.name}`;
        if (context.hidden || tried.has(key) || !wantsDressUp(context, prefs)) continue;
        tried.add(key);
        queue = queue.then(() => dressUp(context.id, context.name, key)).catch(() => undefined);
      }
    };
    visit(useStint.getState().tree);
    // Subscribing here, not with a hook, so the layout hosting this never re-renders for it.
    return useStint.subscribe((state, previous) => {
      if (state.tree !== previous.tree) visit(state.tree);
    });
  }, [ready]);
}
