// The look of a jelly: seven independent traits. Every combination renders, so looks can
// be derived, rerolled and edited one trait at a time. Values are stored in preferences,
// so renaming or removing one only makes stored looks fall back to the derived trait.

import type { Json } from '@/core';

export const bodies = ['blob', 'gumdrop', 'drop', 'bean', 'mochi', 'capsule', 'onigiri', 'star', 'ghost'] as const;
export const eyeStyles = ['dot', 'shiny', 'googly', 'sleepy', 'happy', 'cyclops', 'glasses', 'shades'] as const;
export const mouths = ['smile', 'grin', 'cat', 'o', 'blep', 'fang', 'buck', 'flat', 'wobbly'] as const;
export const toppers = [
  'none',
  'tuft',
  'sprout',
  'flower',
  'antenna',
  'horns',
  'catEars',
  'bearEars',
  'bunnyEars',
  'dogEars',
  'bow',
  'partyHat',
  'chefHat',
  'crown',
  'headphones',
  'halo',
  'sweatband',
  'gradCap',
  'beanie',
  'propeller',
] as const;
export const necks = ['none', 'bowtie', 'tie', 'scarf', 'collar', 'bib', 'medal'] as const;
export const surfaces = ['plain', 'freckles', 'sprinkles', 'spots', 'stripes', 'sugar', 'belly', 'sparkle'] as const;
export const motions = ['bouncy', 'dozy', 'jittery', 'proud', 'curious', 'dreamy', 'wiggly'] as const;

export type Body = (typeof bodies)[number];
export type Eyes = (typeof eyeStyles)[number];
export type Mouth = (typeof mouths)[number];
export type Topper = (typeof toppers)[number];
export type Neck = (typeof necks)[number];
export type Surface = (typeof surfaces)[number];
export type Motion = (typeof motions)[number];

/** Everything that makes a jelly someone. Color and emoji stay on the context. */
export interface Look {
  body: Body;
  eyes: Eyes;
  mouth: Mouth;
  topper: Topper;
  neck: Neck;
  surface: Surface;
  /** How it behaves when awake. */
  motion: Motion;
}

export type Trait = keyof Look;

/** Each trait's options, in the order the editor shows them. */
export const traitOptions: { readonly [K in Trait]: readonly Look[K][] } = {
  body: bodies,
  eyes: eyeStyles,
  mouth: mouths,
  topper: toppers,
  neck: necks,
  surface: surfaces,
  motion: motions,
};

export const traitKeys = ['body', 'eyes', 'mouth', 'topper', 'neck', 'surface', 'motion'] as const satisfies readonly Trait[];

/** Names for the editor. */
export const traitNames: Record<Trait, string> = {
  body: 'Body',
  eyes: 'Eyes',
  mouth: 'Mouth',
  topper: 'Head',
  neck: 'Neck',
  surface: 'Coat',
  motion: 'Mood',
};

export const optionNames: { readonly [K in Trait]: Record<Look[K], string> } = {
  body: {
    blob: 'Blob',
    gumdrop: 'Gumdrop',
    drop: 'Drop',
    bean: 'Bean',
    mochi: 'Mochi',
    capsule: 'Capsule',
    onigiri: 'Onigiri',
    star: 'Star',
    ghost: 'Ghost',
  },
  eyes: {
    dot: 'Dots',
    shiny: 'Shiny',
    googly: 'Googly',
    sleepy: 'Sleepy',
    happy: 'Happy',
    cyclops: 'Cyclops',
    glasses: 'Glasses',
    shades: 'Shades',
  },
  mouth: {
    smile: 'Smile',
    grin: 'Grin',
    cat: 'Cat',
    o: 'Oh',
    blep: 'Blep',
    fang: 'Fang',
    buck: 'Munch',
    flat: 'Smirk',
    wobbly: 'Wobbly',
  },
  topper: {
    none: 'None',
    tuft: 'Curl',
    sprout: 'Sprout',
    flower: 'Flower',
    antenna: 'Antenna',
    horns: 'Horns',
    catEars: 'Cat ears',
    bearEars: 'Bear ears',
    bunnyEars: 'Bunny ears',
    dogEars: 'Dog ears',
    bow: 'Bow',
    partyHat: 'Party hat',
    chefHat: 'Chef hat',
    crown: 'Crown',
    headphones: 'Headphones',
    halo: 'Halo',
    sweatband: 'Sweatband',
    gradCap: 'Grad cap',
    beanie: 'Beanie',
    propeller: 'Propeller',
  },
  neck: {
    none: 'None',
    bowtie: 'Bow tie',
    tie: 'Tie',
    scarf: 'Scarf',
    collar: 'Collar',
    bib: 'Bib',
    medal: 'Medal',
  },
  surface: {
    plain: 'Plain',
    freckles: 'Freckles',
    sprinkles: 'Sprinkles',
    spots: 'Spots',
    stripes: 'Stripes',
    sugar: 'Sugar',
    belly: 'Belly',
    sparkle: 'Sparkle',
  },
  motion: {
    bouncy: 'Bouncy',
    dozy: 'Dozy',
    jittery: 'Jittery',
    proud: 'Proud',
    curious: 'Curious',
    dreamy: 'Dreamy',
    wiggly: 'Wiggly',
  },
};

/** One line per personality, for the editor. */
export const motionBlurbs: Record<Motion, string> = {
  bouncy: 'Hops about',
  dozy: 'Yawns a lot',
  jittery: "Can't sit still",
  proud: 'Puffs up',
  curious: 'Tilts and peeks',
  dreamy: 'Sways and daydreams',
  wiggly: 'Wiggles',
};

/** `value` if it is one of `options`. */
export function member<T extends string>(options: readonly T[], value: unknown): T | undefined {
  return options.find((option) => option === value);
}

function assign<K extends Trait>(out: Partial<Look>, key: K, value: Look[K] | undefined) {
  if (value !== undefined) out[key] = value;
}

/**
 * Reads a stored custom look: the traits someone picked by hand. Unknown or missing traits
 * are left out, so they follow the derived look. Returns undefined when nothing is usable.
 */
export function parseLook(value: Json): Partial<Look> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Partial<Look> = {};
  for (const key of traitKeys) assign(out, key, member(traitOptions[key], value[key]));
  return Object.keys(out).length > 0 ? out : undefined;
}

/** `base` with the traits set in `patch`. */
export function withTraits(base: Look, patch: Partial<Look> | null | undefined): Look {
  if (!patch) return base;
  const out = { ...base };
  for (const key of traitKeys) assign(out, key, patch[key]);
  return out;
}
