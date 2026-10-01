// Resolving a context's look, trait by trait: a custom look someone picked in the editor,
// then the automatic look: the seeded base dressed for the topic and traits Apple's
// on-device model picked for its current name and emoji (see suggest.ts), or for the topic
// its emoji or name points at (derive.ts). All of it is stored as device-local
// preferences, so nothing here touches tracking data.

import { actions, type Json, usePref } from '@/core';

import { freshPick, parseSuggestion, type StoredSuggestion } from './ask';
import { type LookSource, lookFor } from './derive';
import { type Look, parseLook, traitKeys, withTraits } from './traits';

/** Preference key of the custom look: only the traits picked by hand. */
export const customKey = (id: string) => `jelly.look.${id}`;
/** Preference key of the model's picks, with the name and emoji they were made for (ask.ts). */
export const suggestedKey = (id: string) => `jelly.look.ai.${id}`;

/** The traits someone picked by hand for `id`, or null. */
export const useCustomLook = (id: string) => usePref<Partial<Look> | null>(customKey(id), null, parseLook);

/** The model's stored picks for `id`, whatever name they were made for. */
export const useStoredSuggestion = (id: string) => usePref<StoredSuggestion | null>(suggestedKey(id), null, parseSuggestion);

/** The look "Automatic" stands for: the derived look, dressed by the model's picks while they fit. */
export function useAutoLook(source: LookSource): Look {
  return lookFor(source, freshPick(useStoredSuggestion(source.id), source));
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
