// Deriving a look from a context. The emoji (or, without a known emoji, the name) hints at
// fitting traits, e.g. 🐕 floppy ears and a collar; the id seeds everything else. Random
// picks happen in a fixed order before hints apply, so changing the emoji only changes the
// hinted traits and the jelly stays recognisably itself.

import { hashSeed, random } from '../geometry';
import type { Body, Eyes, Look, Motion, Mouth, Neck, Surface, Topper } from './traits';

/** What a look is derived from. A ResolvedContext fits; so does an onboarding preview. */
export interface LookSource {
  id: string;
  glyph: string | null;
  name?: string;
}

interface Topic {
  name: string;
  /** What the topic covers, for the on-device model. Topics without one are emoji-only. */
  about?: string;
  emoji: readonly string[];
  /** Whole words of the name, lowercase. A trailing `*` matches any word starting with it. */
  words: readonly string[];
  look: Partial<Look>;
}

/**
 * What a context can be about, and the traits that say so. The heuristic matches emoji and
 * name words; the on-device model picks a topic by its `about` (see suggest.ts). The first
 * match wins, so the order matters for overlapping words.
 */
export const topics = [
  { name: 'dog', about: 'dogs, walking the dog', emoji: ['🐕', '🐶', '🦮', '🐩', '🐕‍🦺'], words: ['dog', 'dogs', 'puppy', 'walkies', 'hund', 'gassi'], look: { topper: 'dogEars', neck: 'collar', mouth: 'blep', motion: 'bouncy' } },
  { name: 'cat', about: 'cats', emoji: ['🐈', '🐱', '🐈‍⬛', '😺', '😸'], words: ['cat', 'cats', 'kitten', 'katze'], look: { topper: 'catEars', mouth: 'cat', motion: 'curious' } },
  { name: 'rabbit', about: 'rabbits', emoji: ['🐇', '🐰'], words: ['bunny', 'rabbit', 'easter'], look: { topper: 'bunnyEars', mouth: 'buck' } },
  { name: 'family', about: 'kids, babies, family time', emoji: ['🧸', '🐻', '🐼', '👶', '🍼', '🧒'], words: ['kids', 'kid', 'baby', 'family', 'kinder', 'familie'], look: { topper: 'bearEars', eyes: 'shiny' } },
  { name: 'focus', about: 'focused solo work, deep work', emoji: ['🎧'], words: ['deep work', 'focus', 'podcast*'], look: { topper: 'headphones', eyes: 'sleepy', motion: 'dreamy' } },
  { name: 'music', about: 'playing or practicing music, podcasts', emoji: ['🎵', '🎶', '🎹', '🎸', '🎷', '🥁', '🎤', '🎼', '🎻', '🪩'], words: ['music', 'practice', 'band', 'piano', 'guitar', 'musik', 'üben'], look: { topper: 'headphones', mouth: 'o', motion: 'wiggly' } },
  { name: 'office', about: 'a job in general, admin, email, paperwork', emoji: ['💼', '👔', '📊', '📈', '🗂️', '🏢', '🗄️'], words: ['job', 'work', 'office', 'business', 'arbeit', 'büro'], look: { eyes: 'glasses', neck: 'tie', motion: 'proud' } },
  { name: 'meetings', about: 'meetings, calls, standups, syncs, talking', emoji: ['🗣️', '💬', '📞', '☎️', '📣', '👥', '🎙️'], words: ['meeting*', 'call', 'calls', 'standup', 'sync', 'talk', 'besprechung*', 'termin*'], look: { mouth: 'o', neck: 'bowtie', motion: 'jittery' } },
  { name: 'clients', about: 'clients, customers, sales', emoji: ['🤝'], words: ['client*', 'customer*', 'sales', 'kunde*'], look: { neck: 'bowtie', mouth: 'grin', motion: 'proud' } },
  { name: 'cooking', about: 'cooking, baking', emoji: ['🍳', '🧑‍🍳', '👨‍🍳', '👩‍🍳', '🍲', '🥘', '🍝', '🍕', '🔪', '🥧', '🍰'], words: ['cook*', 'kitchen', 'bak*', 'kochen', 'küche', 'backen'], look: { topper: 'chefHat', mouth: 'smile', motion: 'bouncy' } },
  { name: 'eating', about: 'meals, lunch, dinner, snacks', emoji: ['🥪', '🍔', '🍽️', '🍴', '🥗', '🍜', '🌮', '🍱', '🥐', '🍎', '🍌', '🥯', '🌯', '🍟'], words: ['lunch', 'breakfast', 'dinner', 'eat*', 'food', 'snack*', 'brunch', 'mittag*', 'essen', 'frühstück', 'abendessen'], look: { mouth: 'buck', neck: 'bib', motion: 'wiggly' } },
  { name: 'coffee', about: 'coffee', emoji: ['☕', '🧋'], words: ['coffee', 'kaffee'], look: { eyes: 'googly', mouth: 'wobbly', motion: 'jittery' } },
  { name: 'rest', about: 'breaks, naps, sleep', emoji: ['🍵', '🫖', '😴', '🛌', '🛏️', '💤', '🌙'], words: ['tea', 'break', 'pause', 'nap', 'sleep', 'rest', 'bed', 'schlaf*'], look: { eyes: 'sleepy', mouth: 'o', motion: 'dozy' } },
  { name: 'sport', about: 'sport, exercise, gym, running', emoji: ['🏃', '🏃‍♀️', '🏃‍♂️', '🏋️', '🚴', '🏊', '⚽', '🏀', '🎾', '🥊', '🧗', '🏸', '⛹️', '🤸', '🏓', '🚣', '🏄'], words: ['sport*', 'gym', 'run*', 'workout', 'training', 'fitness', 'jog*', 'laufen', 'swim*', 'bike', 'cycling'], look: { topper: 'sweatband', mouth: 'grin', motion: 'bouncy' } },
  { name: 'winning', about: 'competitions, goals, trophies', emoji: ['🏆', '🥇', '🏅', '🎯'], words: ['goal*', 'win*', 'ziel*'], look: { neck: 'medal', topper: 'crown', motion: 'proud' } },
  { name: 'mindfulness', about: 'yoga, meditation, prayer', emoji: ['🧘', '🙏', '😇', '🕊️', '🪷'], words: ['yoga', 'meditat*', 'mindful*', 'calm', 'church'], look: { topper: 'halo', eyes: 'happy', motion: 'dreamy' } },
  { name: 'garden', about: 'gardening, plants', emoji: ['🌱', '🌿', '🪴', '🌳', '🌵', '🍃', '🥕'], words: ['garden*', 'plant*', 'grow*', 'garten'], look: { topper: 'sprout', surface: 'freckles', motion: 'curious' } },
  { name: 'flowers', about: 'flowers', emoji: ['🌸', '🌼', '🌻', '🌷', '🌹', '💐', '🌺'], words: ['flower*', 'blume*'], look: { topper: 'flower', eyes: 'shiny', surface: 'freckles' } },
  { name: 'space', about: 'rockets, space, astronomy', emoji: ['🚀', '🛸', '📡', '🛰️', '🔭'], words: ['launch', 'space', 'rocket'], look: { topper: 'antenna', eyes: 'googly', motion: 'curious' } },
  { name: 'alien', emoji: ['👽'], words: ['alien'], look: { topper: 'antenna', eyes: 'cyclops', mouth: 'o' } },
  { name: 'tinkering', about: 'electronics, repairs, DIY', emoji: ['🤖', '⚙️', '🔧', '🛠️', '🔨'], words: ['robot', 'build*', 'repair*', 'fix*', 'diy'], look: { topper: 'antenna', mouth: 'flat', eyes: 'dot' } },
  { name: 'code', about: 'programming, websites, apps, software projects', emoji: ['💻', '⌨️', '🖥️', '🧑‍💻', '👩‍💻', '👨‍💻', '🐛', '🌐', '📱'], words: ['code', 'coding', 'dev', 'develop*', 'program*', 'hack*', 'bug*', 'website', 'web', 'app', 'apps'], look: { eyes: 'glasses', topper: 'beanie', mouth: 'flat' } },
  { name: 'science', about: 'experiments, research, side projects', emoji: ['🧪', '🔬', '⚗️', '🧬', '💡', '🧫'], words: ['lab', 'science', 'experiment*', 'research', 'side project*', 'idea*'], look: { topper: 'propeller', eyes: 'googly', motion: 'jittery' } },
  { name: 'study', about: 'school, university, courses, a thesis', emoji: ['🎓', '🏫'], words: ['thesis', 'uni', 'university', 'school', 'course', 'class', 'lecture', 'schule', 'studium'], look: { topper: 'gradCap', eyes: 'glasses', motion: 'proud' } },
  { name: 'reading', about: 'reading, writing, journaling', emoji: ['📚', '📖', '📝', '✍️', '📓', '🖋️', '✏️'], words: ['read*', 'book*', 'study', 'learn*', 'homework', 'write', 'writing', 'journal', 'lesen', 'lernen', 'schreiben'], look: { eyes: 'glasses', mouth: 'o', motion: 'curious' } },
  { name: 'games', about: 'games, playing', emoji: ['🎮', '🕹️', '🎲', '🧩', '🃏', '♟️'], words: ['game*', 'gaming', 'play*', 'spiel*'], look: { topper: 'propeller', mouth: 'grin', motion: 'wiggly' } },
  { name: 'party', about: 'parties, birthdays, going out', emoji: ['🎉', '🥳', '🎂', '🎈', '🍻', '🍷', '🎊', '🍾'], words: ['party', 'birthday', 'friends', 'social', 'drinks', 'feier*', 'freunde'], look: { topper: 'partyHat', mouth: 'grin', surface: 'sprinkles', motion: 'wiggly' } },
  { name: 'love', about: 'dating, a partner, romance', emoji: ['❤️', '💕', '💖', '💘', '😍', '🥰', '💑', '💞', '🎀'], words: ['love', 'date', 'partner', 'dating', 'liebe'], look: { topper: 'bow', eyes: 'shiny', mouth: 'cat' } },
  { name: 'leading', about: 'leading or managing a team', emoji: ['👑', '💎', '🦁'], words: ['boss', 'king', 'queen', 'lead*', 'ceo'], look: { topper: 'crown', mouth: 'flat', motion: 'proud' } },
  { name: 'money', about: 'finances, taxes, invoices, banking', emoji: ['💰', '💸', '🏦', '🧾', '💶', '💵', '📉'], words: ['finance*', 'money', 'tax*', 'bank*', 'invoice*', 'accounting', 'budget', 'steuer*', 'rechnung*', 'finanz*'], look: { eyes: 'glasses', mouth: 'wobbly', motion: 'jittery' } },
  { name: 'urgent', about: 'deadlines, emergencies', emoji: ['😈', '🔥', '👿', '🌶️', '⚡'], words: ['urgent', 'fire*', 'deadline*', 'crunch', 'hot'], look: { topper: 'horns', mouth: 'fang', motion: 'jittery' } },
  { name: 'travel', about: 'vacation, travel, the beach', emoji: ['😎', '🕶️', '🏖️', '☀️', '🌴', '✈️', '🧳', '🗺️', '⛱️'], words: ['vacation', 'holiday*', 'beach', 'summer', 'chill*', 'travel*', 'trip', 'urlaub', 'reise*'], look: { eyes: 'shades', mouth: 'flat', motion: 'dreamy' } },
  { name: 'winter', about: 'winter sports, snow', emoji: ['❄️', '⛷️', '🏂', '⛄', '☃️', '🧣', '🧶', '🧤'], words: ['ski*', 'snow*', 'winter', 'knit*'], look: { topper: 'beanie', neck: 'scarf', surface: 'sugar' } },
  { name: 'chores', about: 'cleaning, laundry, chores', emoji: ['🧹', '🧺', '🧽', '🧼', '🪣', '🫧'], words: ['clean*', 'chores', 'laundry', 'tidy', 'putzen', 'wäsche', 'aufräumen'], look: { topper: 'sweatband', mouth: 'wobbly', motion: 'wiggly' } },
  { name: 'art', about: 'art, design, photos, video', emoji: ['🎨', '🖌️', '🖍️', '📸', '📷', '🎬'], words: ['art', 'design*', 'draw*', 'paint*', 'photo*', 'film', 'video*', 'sketch*'], look: { eyes: 'shiny', surface: 'sprinkles', motion: 'dreamy' } },
  { name: 'shopping', about: 'shopping, groceries, errands', emoji: ['🛒', '🛍️'], words: ['shop*', 'grocer*', 'errand*', 'einkauf*', 'einkaufen'], look: { eyes: 'googly', motion: 'curious' } },
  { name: 'commute', about: 'commuting, driving', emoji: ['🚗', '🚆', '🚌', '🚇', '🚲', '🛴', '🚕'], words: ['commute', 'commuting', 'drive', 'driving', 'pendeln'], look: { eyes: 'sleepy', motion: 'dozy' } },
  { name: 'time', emoji: ['⏱️', '⏰', '⌛', '⏳', '🕐', '⌚'], words: ['time', 'timer', 'clock', 'stint'], look: { topper: 'antenna', eyes: 'cyclops', motion: 'jittery' } },
  { name: 'magic', emoji: ['🌌', '✨', '💫', '🔮', '🪄', '🦄', '🌈'], words: ['magic', 'dream*', 'wish*'], look: { surface: 'sparkle', eyes: 'shiny', motion: 'dreamy' } },
  { name: 'star', emoji: ['⭐', '🌟'], words: ['star*'], look: { body: 'star', surface: 'sparkle' } },
  { name: 'ghost', emoji: ['👻'], words: ['ghost*', 'spooky', 'halloween'], look: { body: 'ghost', mouth: 'o' } },
  { name: 'onigiri', emoji: ['🍙', '🍘', '🍣'], words: ['sushi', 'onigiri'], look: { body: 'onigiri' } },
  { name: 'mochi', emoji: ['🍡', '🍥'], words: ['mochi'], look: { body: 'mochi' } },
  { name: 'health', about: 'doctors, health, medicine', emoji: ['💊', '🩺', '🏥', '💉'], words: ['doctor', 'health', 'meds', 'arzt'], look: { body: 'capsule', eyes: 'dot', mouth: 'smile' } },
  { name: 'water', emoji: ['💧', '💦', '🌊', '🚿'], words: ['water', 'swim', 'shower'], look: { body: 'drop' } },
  { name: 'bean', emoji: ['🫘'], words: ['bean*'], look: { body: 'bean' } },
  { name: 'candy', emoji: ['🍬', '🍭', '🧁', '🍩', '🍪', '🍫'], words: ['candy', 'sweets', 'dessert'], look: { surface: 'sprinkles', mouth: 'blep' } },
] as const satisfies readonly Topic[];

export type TopicName = (typeof topics)[number]['name'];

// Emoji presentation selectors and skin tone modifiers don't change what an emoji means.
const EMOJI_NOISE = /[\u{FE0E}\u{FE0F}\u{1F3FB}-\u{1F3FF}]/gu;
/** An emoji without presentation selectors and skin tones, for comparing. */
export const emojiKey = (emoji: string) => emoji.replace(EMOJI_NOISE, '');

const byEmoji = new Map<string, TopicName>();
for (const t of topics) for (const emoji of t.emoji) if (!byEmoji.has(emojiKey(emoji))) byEmoji.set(emojiKey(emoji), t.name);

/** A topic by name. */
export const topic = (name: TopicName): Topic => topics.find((t) => t.name === name) ?? topics[0];

function wordMatch(name: string, words: string[], keyword: string): boolean {
  if (keyword.includes(' ')) return name.includes(keyword.replace('*', ''));
  if (keyword.endsWith('*')) return words.some((word) => word.startsWith(keyword.slice(0, -1)));
  return words.includes(keyword);
}

/** The topic the emoji points at, or the name when the emoji says nothing. */
export function topicFor(glyph: string | null, name?: string): TopicName | undefined {
  const byGlyph = glyph ? byEmoji.get(emojiKey(glyph)) : undefined;
  if (byGlyph || !name) return byGlyph;
  const lower = name.toLowerCase();
  const words = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return topics.find((t) => t.words.some((keyword) => wordMatch(lower, words, keyword)))?.name;
}

/** Traits suggested by the emoji, or by the name when the emoji says nothing. */
export function hintFor(glyph: string | null, name?: string): Partial<Look> {
  const found = topicFor(glyph, name);
  return found ? topic(found).look : {};
}

type Weighted<T> = readonly (readonly [T, number])[];

function weighted<T>(next: () => number, options: Weighted<T>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = next() * total;
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return options[options.length - 1][0];
}

// Random picks only use the generic options. Meaningful ones (chef hat, dog ears, a bib)
// only come from hints or from someone picking them, so they never mislead.
const randomBodies: Weighted<Body> = [
  ['blob', 3],
  ['gumdrop', 2],
  ['drop', 2],
  ['bean', 2],
  ['mochi', 2],
  ['capsule', 2],
  ['onigiri', 2],
  ['star', 1],
  ['ghost', 1],
];
const randomEyes: Weighted<Eyes> = [
  ['dot', 3],
  ['shiny', 3],
  ['googly', 2],
  ['sleepy', 1.5],
  ['happy', 2],
  ['cyclops', 0.8],
  ['glasses', 0.5],
  ['shades', 0.4],
];
const randomMouths: Weighted<Mouth> = [
  ['smile', 3],
  ['cat', 2],
  ['o', 1.2],
  ['blep', 1.5],
  ['fang', 1.5],
  ['grin', 1.5],
  ['wobbly', 0.8],
  ['flat', 0.8],
  ['buck', 0.5],
];
const randomToppers: Weighted<Topper> = [
  ['none', 2.5],
  ['tuft', 3],
  ['sprout', 1],
  ['flower', 1],
  ['antenna', 1],
  ['horns', 1],
  ['catEars', 1],
  ['bearEars', 1.2],
  ['bunnyEars', 0.8],
  ['bow', 1.2],
  ['crown', 0.4],
  ['halo', 0.6],
  ['beanie', 0.6],
  ['partyHat', 0.4],
  ['propeller', 0.5],
];
const randomNecks: Weighted<Neck> = [
  ['none', 7],
  ['bowtie', 1],
  ['scarf', 1],
];
const randomSurfaces: Weighted<Surface> = [
  ['plain', 2],
  ['freckles', 2],
  ['sprinkles', 1.5],
  ['spots', 1.5],
  ['stripes', 1],
  ['sugar', 1],
  ['belly', 1.5],
  ['sparkle', 1],
];
const randomMotions: Weighted<Motion> = [
  ['bouncy', 1],
  ['dozy', 1],
  ['jittery', 1],
  ['proud', 1],
  ['curious', 1],
  ['dreamy', 1],
  ['wiggly', 1],
];

function seededLook(next: () => number): Look {
  return {
    body: weighted(next, randomBodies),
    eyes: weighted(next, randomEyes),
    mouth: weighted(next, randomMouths),
    topper: weighted(next, randomToppers),
    neck: weighted(next, randomNecks),
    surface: weighted(next, randomSurfaces),
    motion: weighted(next, randomMotions),
  };
}

/** The automatic look of a context: stable for its id, emoji and name. */
export function lookFor(source: LookSource): Look {
  const seeded = seededLook(random(hashSeed(`look:${source.id}`)));
  return { ...seeded, ...hintFor(source.glyph, source.name) };
}

/** A fresh random look for "Surprise me", including the meaningful options now and then. */
export function surpriseLook(): Look {
  const look = seededLook(Math.random);
  if (Math.random() < 0.3) look.topper = weighted<Topper>(Math.random, [['dogEars', 1], ['chefHat', 1], ['headphones', 1], ['sweatband', 1], ['gradCap', 1]]);
  if (Math.random() < 0.25) look.neck = weighted<Neck>(Math.random, [['tie', 1], ['collar', 1], ['bib', 1], ['medal', 1]]);
  return look;
}
