import { describe, expect, it } from 'vitest';

import { freshPick, hueChoices, isCurrent, parseSuggestion, readAnswer, type SuggestInput, suggestionJson } from './ask';
import { dress } from './topics';
import type { Look } from './traits';

const base: Look = { body: 'bean', eyes: 'dot', mouth: 'smile', topper: 'tuft', neck: 'none', surface: 'spots', motion: 'proud' };
const dog = { glyph: '🐕', name: 'Dog' };

describe('dress', () => {
  it("uses the emoji's topic without the model", () => {
    expect(dress(base, dog)).toEqual({ ...base, topper: 'dogEars', neck: 'collar', mouth: 'blep', motion: 'bouncy' });
  });

  it("replaces the heuristic topic with the model's instead of mixing them", () => {
    // Cooking brings a chef hat, a smile and bounce; the dog's collar must not stay.
    expect(dress(base, dog, { topic: 'cooking', traits: {} })).toEqual({ ...base, topper: 'chefHat', mouth: 'smile', motion: 'bouncy' });
  });

  it('puts directly picked traits on top, over the heuristic topic when the model found none', () => {
    expect(dress(base, dog, { topic: null, traits: { motion: 'dozy' } })).toEqual({ ...base, topper: 'dogEars', neck: 'collar', mouth: 'blep', motion: 'dozy' });
  });
});

describe('suggested colors', () => {
  const input: SuggestInput = {
    name: 'Garden',
    ancestors: [],
    siblings: [
      { name: 'Job', emoji: '💼', hue: 'blue' },
      { name: 'Dog', emoji: '🐕', hue: 'green' },
    ],
    wantEmoji: true,
    wantHue: true,
  };

  it("offers only candy colors the neighbours don't wear, or all once every one is taken", () => {
    expect(hueChoices(input.siblings)).toEqual(['red', 'orange', 'amber', 'lime', 'teal', 'cyan', 'indigo', 'violet', 'pink']);
    expect(hueChoices(hueChoices([]).map((hue) => ({ name: hue, emoji: null, hue })))).toHaveLength(11);
  });

  it('reads an answer, dropping a taken color and replacing a taken emoji', () => {
    expect(readAnswer(input, { emoji: '🐕', topic: 'garden', motion: 'curious', hue: 'green' })).toEqual({
      topic: 'garden',
      traits: { motion: 'curious' },
      emoji: '🌱',
      hue: null,
    });
    expect(readAnswer(input, { topic: 'flowers', hue: 'purple' })).toMatchObject({ hue: 'violet' });
    expect(readAnswer({ ...input, wantHue: false }, { emoji: '🌻', topic: 'other', motion: 'sleepy', hue: 'lime' })).toEqual({
      topic: null,
      traits: {},
      emoji: '🌻',
      hue: null,
    });
  });
});

describe('stored picks', () => {
  it('keeps applying the old shape for its name until dress-up replaces it', () => {
    const old = parseSuggestion({ name: 'Dog', look: { topper: 'crown', neck: 'nope' } });
    expect(old).toEqual({ version: 1, name: 'Dog', glyph: null, topic: null, traits: { topper: 'crown' } });
    expect(freshPick(old, dog)).toBe(old);
    expect(freshPick(old, { ...dog, name: 'Hund' })).toBeNull();
    expect(isCurrent(old, dog)).toBe(false);
  });

  it('round-trips and only fits the name and emoji it was made for', () => {
    const stored = parseSuggestion(suggestionJson({ topic: 'dog', traits: { motion: 'wiggly' } }, 'Dog', '🐕'));
    expect(stored).toEqual({ version: 2, name: 'Dog', glyph: '🐕', topic: 'dog', traits: { motion: 'wiggly' } });
    expect(isCurrent(stored, dog)).toBe(true);
    expect(freshPick(stored, { ...dog, glyph: '🍳' })).toBeNull();
  });
});
