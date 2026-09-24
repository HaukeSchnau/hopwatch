// Previews of what an edit will do to neighbouring entries, so a slip can say
// "Trims Job to end at 09:12" before you commit. Mirrors the carve rule in the core
// timeline: entries inside the range go, entries over an edge are trimmed.

import { type ContextTree, type Entry, formatClock, formatDuration } from '@/core';

import { proseList } from './words';

type Effect =
  | { kind: 'trim-end'; entry: Entry; at: number }
  | { kind: 'trim-start'; entry: Entry; at: number }
  | { kind: 'split'; entry: Entry }
  | { kind: 'remove'; entry: Entry };

/** The effects of clearing [from, to) of every entry but `exceptId`; `to` null is open-ended. */
function carveEffects(entries: readonly Entry[], from: number, to: number | null, exceptId?: string): Effect[] {
  const until = to ?? Number.POSITIVE_INFINITY;
  const effects: Effect[] = [];
  for (const e of entries) {
    if (e.id === exceptId || e.deletedAt !== null) continue;
    const end = e.endUtc ?? Number.POSITIVE_INFINITY;
    if (end <= from || e.startUtc >= until) continue;
    const keepsHead = e.startUtc < from;
    const keepsTail = end > until;
    if (keepsHead && keepsTail) effects.push({ kind: 'split', entry: e });
    else if (keepsHead) effects.push({ kind: 'trim-end', entry: e, at: from });
    else if (keepsTail) effects.push({ kind: 'trim-start', entry: e, at: until });
    else effects.push({ kind: 'remove', entry: e });
  }
  return effects;
}

/**
 * One sentence about the neighbours an edit touches, or null when it touches none:
 * "Job now ends at 09:12, and Lunch (0:20) is struck out."
 */
export function describeCarve(
  entries: readonly Entry[],
  tree: ContextTree,
  from: number,
  to: number | null,
  now: number,
  exceptId?: string,
): string | null {
  const effects = carveEffects(entries, from, to, exceptId);
  if (effects.length === 0) return null;
  const name = (e: Entry) => tree.byId.get(e.contextId)?.name ?? 'an entry';
  const parts = effects.map((effect) => {
    switch (effect.kind) {
      case 'trim-end':
        return effect.entry.endUtc === null
          ? `${name(effect.entry)} stops at ${formatClock(effect.at)}`
          : `${name(effect.entry)} now ends at ${formatClock(effect.at)}`;
      case 'trim-start':
        return `${name(effect.entry)} now starts at ${formatClock(effect.at)}`;
      case 'split':
        return `${name(effect.entry)} is split around it`;
      case 'remove': {
        const length = (effect.entry.endUtc ?? now) - effect.entry.startUtc;
        return `${name(effect.entry)} (${formatDuration(length)}) is struck out`;
      }
    }
  });
  const sentence = proseList(parts);
  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}
