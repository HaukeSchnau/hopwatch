// Progressive enhancement: while a new jelly is being named, Apple's on-device model
// suggests a look, an emoji and, at the top level, a color (see character/suggest.ts).
// Nothing waits on it: answers arrive a second or two after typing stops, stale ones are
// dropped, and without the model this does nothing at all.

import { useEffect, useRef, useState } from 'react';

import { type ContextId, useHopwatch } from '@/core';

import type { SuggestInput, Suggestion } from './character/ask';
import { suggestForContext, useModelAvailable } from './character/suggest';

/** A suggestion and the name it was made for. */
export interface NameSuggestion {
  forName: string;
  suggestion: Suggestion;
}

/** The parent path and siblings of a jelly under `parentId`, as the model wants them. */
export function suggestInput(name: string, parentId: ContextId | null, self: ContextId | null, wantEmoji: boolean): SuggestInput {
  const tree = useHopwatch.getState().tree;
  const parent = parentId ? tree.byId.get(parentId) : undefined;
  const siblingIds = parent ? parent.childIds : tree.roots;
  return {
    name,
    ancestors: parent ? [...parent.ancestors.map((a) => a.name), parent.name] : [],
    siblings: siblingIds.flatMap((id) => {
      const c = tree.byId.get(id);
      return c && c.id !== self && !c.hidden ? [{ name: c.name, emoji: c.emoji, hue: c.hue }] : [];
    }),
    wantEmoji,
  };
}

/**
 * Asks the model about `name` 600 ms after the last keystroke (two characters or more),
 * and again when the user picks an emoji. `emoji` is the user's pick, or null to get one
 * suggested; `wantHue` asks for a color too. Keeps the last answer that still matched the
 * name when it arrived.
 */
export function useNameSuggestion(name: string, parentId: ContextId | null, emoji: string | null, wantHue: boolean): NameSuggestion | null {
  const available = useModelAvailable();
  const [result, setResult] = useState<NameSuggestion | null>(null);
  const trimmed = name.trim();
  const latest = useRef(trimmed);
  const hue = useRef(wantHue);
  useEffect(() => {
    latest.current = trimmed;
    hue.current = wantHue;
  }, [trimmed, wantHue]);

  useEffect(() => {
    if (!available || trimmed.length < 2) return;
    const timer = setTimeout(() => {
      suggestForContext({ ...suggestInput(trimmed, parentId, null, emoji === null), emoji, wantHue: hue.current })
        .then((suggestion) => {
          if (suggestion && latest.current === trimmed) setResult({ forName: trimmed, suggestion });
        })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [available, parentId, trimmed, emoji]);

  return available ? result : null;
}
