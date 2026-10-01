// What a context can be about, and the traits that say so. The heuristic matches the emoji
// or words of the name; Apple's on-device model picks a topic by its `about` (see ask.ts).
// A topic dresses a jelly's seeded base (derive.ts) as a whole, so one jelly never mixes
// two topics. Pure data and functions, no React Native, so it runs in tests and scripts.

import { type Look, withTraits } from './traits';

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
 * The topics. The heuristic takes the first one whose emoji or words match, so the order
 * matters for overlapping words. Topics without an `about` are never offered to the model.
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
  { name: 'love', about: 'dates, a partner, romance', emoji: ['❤️', '💕', '💖', '💘', '😍', '🥰', '💑', '💞', '🎀'], words: ['love', 'date', 'partner', 'dating', 'liebe'], look: { topper: 'bow', eyes: 'shiny', mouth: 'cat' } },
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


/** What Apple's on-device model picked for a context (see ask.ts). */
export interface Picked {
  /** Null when it found no topic: the emoji's or name's topic applies then. */
  topic: TopicName | null;
  /** Traits it picked directly, beyond the topic. */
  traits: Partial<Look>;
}

/**
 * `base` dressed for one topic: the model's if it picked one, else the topic the emoji or
 * name points at. The topic's traits replace the base's, and traits the model picked
 * directly go on top. The base keeps everything else, so the jelly stays itself.
 */
export function dress(base: Look, source: { glyph: string | null; name?: string }, picked?: Picked | null): Look {
  const found = picked?.topic ?? topicFor(source.glyph, source.name);
  return withTraits(withTraits(base, found && topic(found).look), picked?.traits);
}
