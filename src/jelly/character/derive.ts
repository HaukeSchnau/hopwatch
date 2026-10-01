// Deriving a look from a context. The id seeds every trait; then one topic (topics.ts)
// dresses it, e.g. 🐕 floppy ears and a collar. Random picks happen in a fixed order before
// the topic applies, so a new emoji or topic only changes the traits it brings and the jelly
// stays recognisably itself.

import { hashSeed, random } from '../geometry';
import { dress, type Picked } from './topics';
import type { Body, Eyes, Look, Motion, Mouth, Neck, Surface, Topper } from './traits';

/** What a look is derived from. A ResolvedContext fits; so does an onboarding preview. */
export interface LookSource {
  id: string;
  glyph: string | null;
  name?: string;
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

/**
 * The automatic look of a context: its seeded base dressed for the model's topic and traits
 * when `picked` is given, else for the topic its emoji or name points at.
 */
export function lookFor(source: LookSource, picked?: Picked | null): Look {
  return dress(seededLook(random(hashSeed(`look:${source.id}`))), source, picked);
}

/** A fresh random look for "Surprise me", including the meaningful options now and then. */
export function surpriseLook(): Look {
  const look = seededLook(Math.random);
  if (Math.random() < 0.3) look.topper = weighted<Topper>(Math.random, [['dogEars', 1], ['chefHat', 1], ['headphones', 1], ['sweatband', 1], ['gradCap', 1]]);
  if (Math.random() < 0.25) look.neck = weighted<Neck>(Math.random, [['tie', 1], ['collar', 1], ['bib', 1], ['medal', 1]]);
  return look;
}
