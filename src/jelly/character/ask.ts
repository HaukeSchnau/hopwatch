// What we ask Apple's on-device model about a jelly, how its answer is read and how the
// picks are stored. Pure, so the tests and the prompt eval (scripts/model.sh) use exactly
// what the app sends; suggest.ts does the asking.
//
// One request per jelly. The model picks a topic and a mood; for a new jelly also an emoji,
// and for a new top-level one a color the other top-level jellies don't use yet. Measured
// on 46 English and German names (docs/design/jelly-characters.md): topics and moods come
// out right about nine times in ten. Asked for eyes or a mouth, it said "sparkly" or
// "open mouth" for nearly everything, so those stay with the topic and the seed.

import type { Json } from '@/core';
import { type Hue, hues } from '@/core/model';

import { emojiKey, type Picked, topic, type TopicName, topics } from './topics';
import { member, type Motion, motions, parseLook, traitKeys } from './traits';

export interface SuggestInput {
  name: string;
  /** Names from the root down to the parent, e.g. ["Clients", "Acme"]. */
  ancestors: string[];
  /** Other contexts in the same group (or at the top level), so suggestions stay distinct. */
  siblings: { name: string; emoji: string | null; hue?: Hue }[];
  /** Ask for an emoji too (only when the user hasn't picked one). */
  wantEmoji: boolean;
  /** Ask for a color too (new top-level jellies, until the user picks one). */
  wantHue?: boolean;
  /** The context's own emoji, when it has one; it helps with names that say little. */
  emoji?: string | null;
}

export interface Suggestion extends Picked {
  /** A single emoji, or null when not asked for or no usable one came back. */
  emoji: string | null;
  /** A color no sibling uses (if any is left), or null when not asked for. */
  hue: Hue | null;
}

type Asked = Extract<(typeof topics)[number], { about: string }>;
const asked = topics.filter((t): t is Asked => 'about' in t);
const topicNames = asked.map((t) => t.name);

/** The activities each mood fits, for the model. Described as adjectives, nearly everything was "curious". */
const moods: Record<Motion, string> = {
  bouncy: 'sport, play, errands, anything energetic',
  dozy: 'breaks, naps, commuting, dull chores and admin',
  jittery: 'deadlines, stress, coffee, anything rushed',
  proud: 'achievements, presenting, leading, formal work',
  curious: 'learning, research, exploring, new projects',
  dreamy: 'relaxing, meditation, creative work, daydreaming',
  wiggly: 'food, parties, friends, anything fun',
};

/** Color names the model knows better than the palette's keys. */
const hueWords: Record<Hue, string> = {
  red: 'red',
  orange: 'orange',
  amber: 'yellow',
  lime: 'lime',
  green: 'green',
  teal: 'teal',
  cyan: 'sky blue',
  blue: 'blue',
  indigo: 'indigo',
  violet: 'purple',
  pink: 'pink',
  gray: 'gray',
};

const INSTRUCTIONS = [
  'Every activity in a personal time tracker is a little jelly character. You pick its topic and mood.',
  'Names can be English or German.',
  "Judge by the activity's own name and emoji, and pick the most specific topic.",
  'Its group and the other activities in the group only help when the name alone says nothing, like a client or project name.',
  'Work done for a client gets the topic of the work: a website or an app for a client is code, not clients.',
  'Topics:',
  ...asked.map((t) => `${t.name}: ${t.about}`),
  'other: none of these',
  'Moods:',
  ...motions.map((m) => `${m}: ${moods[m]}`),
].join('\n');

const withEmoji = (name: string, emoji: string | null | undefined) => (emoji ? `${name} ${emoji}` : name);

function promptFor(input: SuggestInput, group: boolean): string {
  const lines: string[] = [];
  if (group && input.ancestors.length > 0) lines.push(`Group: ${input.ancestors.join(' › ')}`);
  if (group && input.siblings.length > 0) lines.push(`Also in the group: ${input.siblings.map((s) => withEmoji(s.name, s.emoji)).join(', ')}`);
  lines.push(`Activity: ${withEmoji(input.name, input.emoji)}`);
  return lines.join('\n');
}

// Gray is what a jelly without a color gets, and the model leaned on it for dull names.
const candy = hues.filter((h) => h !== 'gray');

/** The colors a new jelly may get: candy colors no sibling wears, or all of them once every one is taken. */
export function hueChoices(siblings: SuggestInput['siblings']): readonly Hue[] {
  const taken = new Set(siblings.map((s) => s.hue));
  const free = candy.filter((h) => !taken.has(h));
  return free.length > 0 ? free : candy;
}

const takenEmoji = (siblings: SuggestInput['siblings']) => siblings.flatMap((s) => (s.emoji ? [s.emoji] : []));

/**
 * The request for `input`: instructions, prompt and the fields to fill. `group: false`
 * leaves out the group and siblings (the retry when they trip a guardrail).
 */
export function requestFor(input: SuggestInput, group = true) {
  const taken = takenEmoji(input.siblings);
  // The emoji comes first: asked after the mood, it drifted to 😴 for anything dozy.
  const fields = [
    ...(input.wantEmoji
      ? [{ name: 'emoji', description: `One emoji character that shows this activity${taken.length > 0 ? `. Not ${taken.join(' or ')}, those are taken` : ''}.` }]
      : []),
    { name: 'topic', description: 'The topic this activity is about.', choices: [...topicNames, 'other'] },
    { name: 'motion', description: 'The mood that fits this activity.', choices: motions },
    ...(input.wantHue
      ? [
          {
            name: 'hue',
            description: 'The color of the emoji or of the thing the activity is about, like green for plants, blue for water or sleep, red for sport or urgent things, pink for love.',
            choices: hueChoices(input.siblings).map((h) => hueWords[h]),
          },
        ]
      : []),
  ];
  return { instructions: INSTRUCTIONS, prompt: promptFor(input, group), fields };
}

/** The fields a request may have, as they come back. */
type Answer = { readonly [K in 'emoji' | 'topic' | 'motion' | 'hue']?: string };

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
function pickEmoji(answer: string | undefined, found: TopicName | null, siblings: SuggestInput['siblings']): string | null {
  const taken = new Set(takenEmoji(siblings).map(emojiKey));
  const own = answer ? singleEmoji(answer) : null;
  if (own && !taken.has(emojiKey(own))) return own;
  return (found && topic(found).emoji.find((e) => !taken.has(emojiKey(e)))) || own;
}

/** Reads the model's answer to `requestFor(input)`. Values outside the choices are dropped. */
export function readAnswer(input: SuggestInput, answer: Answer): Suggestion {
  const found = member(topicNames, answer.topic) ?? null;
  const motion = member(motions, answer.motion);
  return {
    topic: found,
    traits: motion ? { motion } : {},
    emoji: input.wantEmoji ? pickEmoji(answer.emoji, found, input.siblings) : null,
    hue: input.wantHue ? (hueChoices(input.siblings).find((h) => hueWords[h] === answer.hue) ?? null) : null,
  };
}

/**
 * Bump when what the model picks changes, so dress-up asks about every jelly once more.
 * 1 was `{ name, look }`: a topper and neckwear from the topic, no emoji.
 */
export const SUGGESTION_VERSION = 2;

/** Model picks as stored (`jelly.look.ai.<id>`), with the name and emoji they were made for. */
export interface StoredSuggestion extends Picked {
  version: number;
  name: string;
  /** The emoji the picks were made with. Version 1 didn't keep it. */
  glyph: string | null;
}

/** Reads stored picks, old shape included. Unknown topics and traits are dropped. */
export function parseSuggestion(value: Json): StoredSuggestion | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { v, name, glyph, topic: found, look } = value;
  if (typeof name !== 'string') return undefined;
  return {
    version: typeof v === 'number' ? v : 1,
    name,
    glyph: typeof glyph === 'string' ? glyph : null,
    topic: member(topicNames, found) ?? null,
    traits: (look !== undefined && parseLook(look)) || {},
  };
}

/** The stored form of `picked`, made for `name` and `glyph`. */
export function suggestionJson(picked: Picked, name: string, glyph: string | null): Json {
  const look: { [key: string]: Json } = {};
  for (const key of traitKeys) {
    const value = picked.traits[key];
    if (value !== undefined) look[key] = value;
  }
  return { v: SUGGESTION_VERSION, name, glyph, topic: picked.topic, look };
}

/**
 * The stored picks if they still fit the context: made for its name and, since version 2,
 * its emoji. Old picks keep applying until dress-up replaces them.
 */
export function freshPick(stored: StoredSuggestion | null | undefined, source: { glyph: string | null; name?: string }): StoredSuggestion | null {
  if (!stored || stored.name !== source.name) return null;
  return stored.version < 2 || stored.glyph === source.glyph ? stored : null;
}

/** Whether `stored` is current: the latest version, made for the context's name and emoji. */
export const isCurrent = (stored: StoredSuggestion | null | undefined, source: { glyph: string | null; name?: string }) =>
  stored?.version === SUGGESTION_VERSION && freshPick(stored, source) !== null;

