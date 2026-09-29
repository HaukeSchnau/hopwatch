// Resolving a context's look, trait by trait: a custom look someone picked in the editor,
// then the traits Apple's on-device model picked for its current name (see suggest.ts),
// then the look derived from its id, emoji and name (derive.ts). All of it is stored as
// device-local preferences, so nothing here touches tracking data.

import { actions, type Json, usePref } from '@/core';

import { type LookSource, lookFor } from './derive';
import { type Look, parseLook, traitKeys, withTraits } from './traits';

/** Preference key of the custom look: only the traits picked by hand. */
export const customKey = (id: string) => `jelly.look.${id}`;
/** Preference key of the model-picked traits, with the name they were picked for. */
export const suggestedKey = (id: string) => `jelly.look.ai.${id}`;

/** Model-picked traits as stored: `{ name, look }`. */
export interface StoredSuggestion {
  name: string;
  look: Partial<Look>;
}

export function parseSuggestion(value: Json): StoredSuggestion | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { name, look } = value;
  if (typeof name !== 'string') return undefined;
  return { name, look: (look !== undefined && parseLook(look)) || {} };
}

/** The traits someone picked by hand for `id`, or null. */
export const useCustomLook = (id: string) => usePref<Partial<Look> | null>(customKey(id), null, parseLook);

/** The stored model suggestion for `id`, whatever name it was made for. */
export const useStoredSuggestion = (id: string) => usePref<StoredSuggestion | null>(suggestedKey(id), null, parseSuggestion);

/** The look "Automatic" stands for: model-picked traits for the current name over the derived look. */
export function useAutoLook(source: LookSource): Look {
  const suggestion = useStoredSuggestion(source.id);
  const fresh = suggestion && suggestion.name === source.name ? suggestion.look : null;
  return withTraits(lookFor(source), fresh);
}

/** The look a context wears: custom traits over the automatic look. */
export function useLook(source: LookSource): Look {
  const auto = useAutoLook(source);
  return withTraits(auto, useCustomLook(source.id));
}

/**
 * Stores the traits picked by hand. Traits equal to the automatic look are dropped, so
 * they keep following it; an empty result clears the custom look ("Automatic").
 */
export function saveCustomLook(id: string, picked: Partial<Look> | null, auto: Look) {
  const out: { [key: string]: Json } = {};
  if (picked) {
    for (const key of traitKeys) {
      const value = picked[key];
      if (value !== undefined && value !== auto[key]) out[key] = value;
    }
  }
  actions.setPref(customKey(id), Object.keys(out).length > 0 ? out : null);
}
