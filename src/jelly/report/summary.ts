// The week in a few friendly sentences. Facts come from code (core/week-facts.ts);
// Apple's on-device model only words them, and an answer with numbers or days the facts
// don't have is turned down. Each week's summary stays in device prefs with a hash of its
// facts, so it shows at once next time and is only written again when the facts change.
// Without the model nothing new is written and nothing waits on it. The summary is in the
// app's language; after a language change the prompt differs, so a new one is written.

import { generate } from '@modules/on-device-model';
import { useEffect, useMemo, useState } from 'react';

import { actions, checkSummary, type Json, MINUTE, summaryRequest, useEntries, useNow, usePref, useTree, weekFacts, type WeekFacts } from '@/core';

import { useModelAvailable } from '../character/suggest';

/** Asks the model to word `week`, once more when the first answer doesn't check out. */
async function write(week: WeekFacts): Promise<string | null> {
  const request = summaryRequest(week);
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = await generate(request);
    if (!answer) return null;
    // Stint's text uses plain punctuation; the model likes em dashes.
    const text = answer.summary.trim().replace(/\s*—\s*/g, ', ');
    const problem = checkSummary(text, week);
    if (!problem) return text;
    if (__DEV__) console.warn(`week summary turned down (${problem}): ${text}`);
  }
  return null;
}

interface Stored {
  hash: string;
  text: string;
}

const parseStored = (value: Json): Stored | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && typeof value.hash === 'string' && typeof value.text === 'string'
    ? { hash: value.hash, text: value.text }
    : undefined;

/** A short, stable fingerprint of what the model is asked (32-bit FNV-1a). */
function hashOf(week: WeekFacts): string {
  let hash = 0x811c9dc5;
  for (const char of summaryRequest(week).prompt) hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193);
  return (hash >>> 0).toString(36);
}

const pad = (n: number) => String(n).padStart(2, '0');
/** The pref holding a week's summary: jelly.summary.2026-09-28. */
const keyOf = (weekStart: number) => {
  const d = new Date(weekStart);
  return `jelly.summary.${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Requests in flight and facts the model couldn't word this session, by key and hash. */
const pending = new Map<string, Promise<void>>();
const failed = new Set<string>();

const STEP = 30 * MINUTE;

export type SummaryState =
  /** The summary; `stale` while a newer one is being written for changed facts. */
  | { text: string; stale: boolean }
  /** The first summary for this week is on its way. */
  | 'writing';

/**
 * The summary for the week starting at `weekStart`, or null when there is none to show:
 * too little data, no model, or an answer that didn't check out.
 */
export function useWeekSummary(weekStart: number): SummaryState | null {
  const entries = useEntries();
  const tree = useTree();
  // The clock moves in half-hour steps, so a running entry asks for a new summary at most
  // twice an hour, while edits change the facts at once.
  const now = Math.floor(useNow(STEP) / STEP) * STEP;
  const facts = useMemo(() => weekFacts(entries, tree, weekStart, now), [entries, tree, weekStart, now]);
  const hash = facts ? hashOf(facts) : null;
  const key = keyOf(weekStart);
  const stored = usePref<Stored | null>(key, null, parseStored);
  const available = useModelAvailable();
  const id = `${key}#${hash}`;
  const fresh = stored !== null && stored.hash === hash;
  // Bumped when a request settles, so a failure hides the loading state.
  const [, settle] = useState(0);

  useEffect(() => {
    if (!facts || hash === null || fresh || !available || failed.has(id)) return;
    let live = true;
    let request = pending.get(id);
    if (!request) {
      request = write(facts)
        .then((text) => {
          if (text) actions.setPref(key, { hash, text });
          else failed.add(id);
        })
        .catch(() => {
          failed.add(id);
        })
        .finally(() => pending.delete(id));
      pending.set(id, request);
    }
    void request.then(() => live && settle((n) => n + 1));
    return () => {
      live = false;
    };
  }, [available, facts, fresh, hash, id, key]);

  if (hash === null) return null;
  if (fresh) return { text: stored.text, stale: false };
  if (!available || failed.has(id)) return null;
  return stored ? { text: stored.text, stale: true } : 'writing';
}
