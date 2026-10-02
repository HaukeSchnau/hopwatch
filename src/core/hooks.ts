// Read-side hooks for screens. All derived data is memoized on the store's
// immutable arrays, so selectors stay cheap.

import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import type { ContextId, EntryId } from './model';
import { dayReport, weekReport } from './reports';
import { type Json, type LastAction, useHopwatch } from './store';
import { addDays } from './time';
import { findOpen, gapAt, previousContextId } from './timeline';
import { pickable, type ResolvedContext } from './tree';

export const useTree = () => useHopwatch((s) => s.tree);
export const useEntries = () => useHopwatch((s) => s.entries);

export function useContextById(id: ContextId | null | undefined): ResolvedContext | null {
  return useHopwatch((s) => (id ? (s.tree.byId.get(id) ?? null) : null));
}

export function useEntry(id: EntryId | null | undefined) {
  return useHopwatch((s) => (id ? (s.entries.find((e) => e.id === id) ?? null) : null));
}

/** Contexts that can be started: not archived, not under an archived parent. */
export function usePickableContexts(): ResolvedContext[] {
  const tree = useTree();
  return useMemo(() => pickable(tree), [tree]);
}

/**
 * The current time, re-rendering every `intervalMs` and when the app returns to the
 * foreground. Ticks are aligned to multiples of the interval, so a seconds display
 * changes together with the wall clock. Pass null for a value that only refreshes on
 * foregrounding.
 */
export function useNow(intervalMs: number | null = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const sub = AppState.addEventListener('change', (state) => state === 'active' && tick());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (intervalMs === null) return;
      timer = setTimeout(() => {
        tick();
        schedule();
      }, intervalMs - (Date.now() % intervalMs) + 5);
    };
    schedule();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [intervalMs]);
  return now;
}

export interface Running {
  entry: NonNullable<ReturnType<typeof findOpen>>;
  context: ResolvedContext;
}

/** The running entry and its context, or null. */
export function useRunning(): Running | null {
  const entries = useEntries();
  const tree = useTree();
  return useMemo(() => {
    const entry = findOpen(entries);
    const context = entry && tree.byId.get(entry.contextId);
    return entry && context ? { entry, context } : null;
  }, [entries, tree]);
}

/**
 * What the big "back" button offers: "Back to X" while something runs, "Resume X"
 * when nothing does. Null when there is no sensible target. `actions.back()` starts it.
 */
export function useSwitchTarget(): { kind: 'back' | 'resume'; context: ResolvedContext } | null {
  const entries = useEntries();
  const tree = useTree();
  return useMemo(() => {
    const id = previousContextId(entries);
    const context = id && tree.byId.get(id);
    if (!context || context.hidden) return null;
    return { kind: findOpen(entries) ? 'back' : 'resume', context };
  }, [entries, tree]);
}

/**
 * Pinned contexts. `slots` keeps holes where a tile was unpinned, so the remaining
 * tiles never move; render `slots` for a muscle-memory grid.
 */
export function usePinned(): { tiles: ResolvedContext[]; slots: (ResolvedContext | null)[] } {
  const tree = useTree();
  return useMemo(() => {
    const tiles = pickable(tree)
      .filter((c) => c.pinPosition !== null)
      .sort((a, b) => a.pinPosition! - b.pinPosition!);
    const size = tiles.length ? tiles[tiles.length - 1].pinPosition! + 1 : 0;
    const slots: (ResolvedContext | null)[] = Array.from({ length: size }, () => null);
    for (const t of tiles) slots[t.pinPosition!] = t;
    return { tiles, slots };
  }, [tree]);
}

/** Recently used contexts, newest first, excluding pinned ones and the running one. */
export function useRecents(limit = 6): ResolvedContext[] {
  const entries = useEntries();
  const tree = useTree();
  return useMemo(() => {
    const running = findOpen(entries)?.contextId;
    const seen = new Set<ContextId>();
    const result: ResolvedContext[] = [];
    for (let i = entries.length - 1; i >= 0 && result.length < limit; i--) {
      const id = entries[i].contextId;
      if (seen.has(id) || id === running) continue;
      seen.add(id);
      const c = tree.byId.get(id);
      if (c && !c.hidden && c.pinPosition === null) result.push(c);
    }
    return result;
  }, [entries, tree, limit]);
}

/** Totals, segments, gaps and fragmentation for the local day starting at `dayStart`. */
export function useDayReport(dayStart: number) {
  const entries = useEntries();
  const tree = useTree();
  // Past days stop at their end, so their report stays memoized while the clock ticks.
  const at = Math.min(useNow(15_000), addDays(dayStart, 1));
  return useMemo(() => dayReport(entries, tree, dayStart, at), [entries, tree, dayStart, at]);
}

/** Per-day reports, week totals and target lines for the week starting at `weekStart`. */
export function useWeekReport(weekStart: number) {
  const entries = useEntries();
  const tree = useTree();
  const at = Math.min(useNow(30_000), addDays(weekStart, 7));
  return useMemo(() => weekReport(entries, tree, weekStart, at), [entries, tree, weekStart, at]);
}

/** The gap around `at`, for "what was this?" sheets. Null inside an entry. */
export function useGapAt(at: number | null) {
  const entries = useEntries();
  const now = useNow(60_000);
  return useMemo(() => (at === null ? null : gapAt(entries, at, now)), [entries, at, now]);
}

/**
 * Drives the "Switched to X · Undo" toast. `action` stays set for `windowMs` after the
 * last timeline change; render it while `visible`.
 */
export function useUndoToast(windowMs = 5000): { action: LastAction | null; visible: boolean } {
  const action = useHopwatch((s) => s.lastAction);
  // The action whose window has run out. A screen mounting after the window starts hidden.
  const [expired, setExpired] = useState<LastAction | null>(() =>
    action && action.at + windowMs <= Date.now() ? action : null,
  );
  useEffect(() => {
    if (!action) return;
    const timer = setTimeout(() => setExpired(action), Math.max(0, action.at + windowMs - Date.now()));
    return () => clearTimeout(timer);
  }, [action, windowMs]);
  return { action, visible: action !== null && expired !== action };
}

/**
 * A UI preference set with `actions.setPref`, or `fallback` when unset. `parse` checks the
 * stored JSON and returns undefined when it doesn't fit, e.g. after a format change.
 */
export function usePref<T>(key: string, fallback: T, parse: (value: Json) => T | undefined): T {
  const stored = useHopwatch((s) => s.prefs[key]);
  return stored === undefined ? fallback : (parse(stored) ?? fallback);
}

/** A pending request from outside the app, e.g. a tapped nudge asking for the stop sheet. */
export const useIntent = () => useHopwatch((s) => s.intent);
