// Progressive enhancement: while a new jelly is being named, Apple's on-device model
// suggests an emoji and a look (see character/suggest.ts). Nothing waits on it: answers
// arrive about a second after typing stops, stale ones are dropped, and without the
// model this does nothing at all.

import { useEffect, useRef, useState } from 'react';

import { type ContextId, useStint } from '@/core';

import { type SuggestInput, type Suggestion, suggestForContext, useModelAvailable } from './character/suggest';

/** A suggestion and the name it was made for. */
export interface NameSuggestion {
  forName: string;
  suggestion: Suggestion;
}

/** The parent path and siblings of a jelly under `parentId`, as the model wants them. */
export function suggestInput(name: string, parentId: ContextId | null, self: ContextId | null, wantEmoji: boolean): SuggestInput {
  const tree = useStint.getState().tree;
  const parent = parentId ? tree.byId.get(parentId) : undefined;
  const siblingIds = parent ? parent.childIds : tree.roots;
  return {
    name,
    ancestors: parent ? [...parent.ancestors.map((a) => a.name), parent.name] : [],
    siblings: siblingIds.flatMap((id) => {
      const c = tree.byId.get(id);
      return c && c.id !== self && !c.hidden ? [{ name: c.name, emoji: c.emoji }] : [];
    }),
    wantEmoji,
  };
}

/**
 * Asks the model about `name` 600 ms after the last keystroke (two characters or more).
 * Keeps the last answer that still matched the name when it arrived.
 */
export function useNameSuggestion(name: string, parentId: ContextId | null, wantEmoji: boolean): NameSuggestion | null {
  const available = useModelAvailable();
  const [result, setResult] = useState<NameSuggestion | null>(null);
  const trimmed = name.trim();
  const latest = useRef(trimmed);
  const wants = useRef(wantEmoji);
  useEffect(() => {
    latest.current = trimmed;
    wants.current = wantEmoji;
  }, [trimmed, wantEmoji]);

  useEffect(() => {
    if (!available || trimmed.length < 2) return;
    const timer = setTimeout(() => {
      suggestForContext(suggestInput(trimmed, parentId, null, wants.current))
        .then((suggestion) => {
          if (suggestion && latest.current === trimmed) setResult({ forName: trimmed, suggestion });
        })
        .catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [available, parentId, trimmed]);

  return available ? result : null;
}
