// Apple's on-device model as a progressive enhancement for the characters: asks about a
// jelly (what is asked and how the answer is read lives in ask.ts) and dresses up existing
// jellies in the background. Without the model, nothing here shows up and the heuristics
// in topics.ts do all the work.

import { type Availability, availability, generate } from '@modules/on-device-model';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { actions, type ContextId, type ContextTree, type Json, type ResolvedContext, useHopwatch } from '@/core';

import { isCurrent, parseSuggestion, readAnswer, requestFor, type SuggestInput, type Suggestion, suggestionJson } from './ask';
import { customKey, suggestedKey } from './look';
import type { Picked } from './topics';
import { parseLook, traitKeys } from './traits';

/**
 * Asks the on-device model about a jelly in one request: its topic and mood, plus an emoji
 * and a color when the input asks for them. Null when the model is unavailable or failed.
 * If the group trips a guardrail, it asks again without it.
 */
export async function suggestForContext(input: SuggestInput): Promise<Suggestion | null> {
  const answer = (await generate(requestFor(input))) ?? (input.ancestors.length + input.siblings.length > 0 ? await generate(requestFor(input, false)) : null);
  return answer && readAnswer(input, answer);
}

/** Stores the model's picks for a context, made for its name and emoji (below a custom look). */
export function saveSuggestedLook(contextId: ContextId, picked: Picked, forName: string, forGlyph: string | null): void {
  actions.setPref(suggestedKey(contextId), suggestionJson(picked, forName, forGlyph));
}

let known: Availability | null = null;

/** True when Apple's on-device model can answer right now. Rechecks when the app returns. */
export function useModelAvailable(): boolean {
  const [ready, setReady] = useState(known === 'available');
  useEffect(() => {
    let live = true;
    const check = () =>
      availability()
        .catch((): Availability => 'unsupported')
        .then((next) => {
          known = next;
          if (live) setReady(next === 'available');
        });
    void check();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && void check());
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  return ready;
}

/** What the model hears about an existing context: its name, emoji, group and neighbours. */
export function suggestInputFor(tree: ContextTree, context: ResolvedContext, wantEmoji = false): SuggestInput {
  const siblingIds = context.parentId ? (tree.byId.get(context.parentId)?.childIds ?? []) : tree.roots;
  const siblings = siblingIds
    .filter((id) => id !== context.id)
    .flatMap((id) => {
      const sibling = tree.byId.get(id);
      return sibling && !sibling.hidden ? [{ name: sibling.name, emoji: sibling.glyph }] : [];
    })
    .slice(0, 8);
  return { name: context.name, ancestors: context.ancestors.map((a) => a.name), siblings, wantEmoji, emoji: context.glyph };
}

/** Whether a context still needs the model's picks for its current name and emoji. */
function wantsDressUp(context: ResolvedContext, prefs: Readonly<Record<string, Json>>): boolean {
  const stored = prefs[suggestedKey(context.id)];
  if (stored !== undefined && isCurrent(parseSuggestion(stored), context)) return false;
  const custom = prefs[customKey(context.id)];
  const picked = custom === undefined ? undefined : parseLook(custom);
  // Every trait picked by hand: nothing left to dress.
  return !picked || traitKeys.some((key) => picked[key] === undefined);
}

// Background requests run one at a time, and each context, name and emoji is tried once per launch.
const tried = new Set<string>();
let queue: Promise<void> = Promise.resolve();

async function dressUp(id: ContextId, name: string, glyph: string | null, key: string) {
  const state = useHopwatch.getState();
  const context = state.tree.byId.get(id);
  // Renamed, re-emojied or gone meanwhile: the new name or emoji gets its own turn.
  if (!context || context.name !== name || context.glyph !== glyph || !wantsDressUp(context, state.prefs)) return;
  if ((await availability().catch(() => 'unsupported')) !== 'available') {
    tried.delete(key);
    return;
  }
  const suggestion = await suggestForContext(suggestInputFor(state.tree, context));
  // A failed answer isn't stored: failures were often the model having a bad moment, so
  // the next launch asks again. Until then the heuristic look applies.
  if (suggestion) saveSuggestedLook(id, suggestion, name, glyph);
}

/**
 * Gives existing contexts the model's picks in the background, one at a time, and again
 * after a rename or a new emoji. A new topper drops in with a sparkle (see Gummy). Never
 * touches emojis or colors. Mount once in Jelly's layout.
 */
export function useDressUp(): void {
  const ready = useModelAvailable();
  useEffect(() => {
    if (!ready) return;
    const visit = (tree: ContextTree) => {
      const { prefs } = useHopwatch.getState();
      for (const context of tree.ordered) {
        const key = `${context.id}\n${context.name}\n${context.glyph ?? ''}`;
        if (context.hidden || tried.has(key) || !wantsDressUp(context, prefs)) continue;
        tried.add(key);
        queue = queue.then(() => dressUp(context.id, context.name, context.glyph, key)).catch(() => undefined);
      }
    };
    visit(useHopwatch.getState().tree);
    // Subscribing here, not with a hook, so the layout hosting this never re-renders for it.
    return useHopwatch.subscribe((state, previous) => {
      if (state.tree !== previous.tree) visit(state.tree);
    });
  }, [ready]);
}
