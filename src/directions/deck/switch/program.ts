// What the knob is dialling: a backdated start, a backdated "back to", or a backdated
// stop. SWITCH holds one of these while the knob panel is out.

import { type ContextId, type ContextTree, HOUR, MINUTE, type ResolvedContext, type Running } from '@/core';

export type Program = { kind: 'start'; contextId: ContextId } | { kind: 'back'; contextId: ContextId } | { kind: 'stop' };

/** The context the program acts on: the one being started, or the running one for stop. */
export function programTarget(program: Program, tree: ContextTree, running: Running | null): ResolvedContext | null {
  if (program.kind === 'stop') return running?.context ?? null;
  return tree.byId.get(program.contextId) ?? null;
}

export const KNOB_STEP_MINUTES = 5;
const MAX_REWIND = 12 * HOUR;

/** How far back the knob may go, in minutes, snapped down to whole detents. */
export function maxRewindMinutes(program: Program, running: Running | null, now: number): number {
  const limit = program.kind === 'stop' ? (running ? now - running.entry.startUtc : 0) : MAX_REWIND;
  return Math.max(0, Math.floor(limit / MINUTE / KNOB_STEP_MINUTES) * KNOB_STEP_MINUTES);
}
