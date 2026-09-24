// Development only: sets up state for design review without taps, because the
// simulators are driven remotely and taps are slow. Steps come as path segments,
// e.g. /almanac/demo/resample/start:Website:84/to:day (launch arguments can't carry
// query strings, so everything is a segment).

import type { Href } from 'expo-router';

import { actions, type EntryId, eraseAllData, loadSampleData, MINUTE, startOfDay, useStint } from '@/core';

import { dayParam } from './dates';

/**
 * Runs the steps and returns where to go next. Steps: `sample` (load samples when
 * empty), `resample`, `erase`, `start:<name>[:<minutes ago>]`, `stop`, `back`,
 * `nudge`, and one `to:<page>` (home, first, day, day-1, week, week-day, contexts,
 * colophon, slip-stop, slip-start:<name>, gap, entry, edit:<name>, new).
 */
export function runDemo(steps: string[]): Href {
  let target: Href = '/almanac';
  for (const step of steps) {
    const [kind, arg, extra] = step.split(':');
    const state = useStint.getState();
    const byName = (name: string | undefined) =>
      state.tree.ordered.find((c) => c.name.toLowerCase() === (name ?? '').toLowerCase().replace(/_/g, ' '));
    if (kind === 'sample' && state.contexts.length === 0) loadSampleData();
    else if (kind === 'resample') loadSampleData();
    else if (kind === 'erase') eraseAllData();
    else if (kind === 'stop') actions.stop();
    else if (kind === 'back') actions.back();
    else if (kind === 'nudge') actions.setIntent({ kind: 'stop-sheet' });
    else if (kind === 'start') {
      const context = byName(arg);
      if (context) actions.start(context.id, extra ? { at: Date.now() - Number(extra) * MINUTE } : {});
    } else if (kind === 'to') target = targetOf(arg, extra);
  }
  return target;
}

function targetOf(page: string | undefined, arg: string | undefined): Href {
  const state = useStint.getState();
  const today = startOfDay(Date.now());
  switch (page) {
    case 'first':
      return { pathname: '/almanac', params: { preview: 'first' } };
    case 'day':
      return '/almanac/day';
    case 'day-1':
      return { pathname: '/almanac/day', params: { date: dayParam(today - 12 * 60 * MINUTE) } };
    case 'week':
      return '/almanac/week';
    case 'week-day':
      return { pathname: '/almanac/week', params: { mode: 'day' } };
    case 'contexts':
      return '/almanac/contexts';
    case 'colophon':
      return '/almanac/colophon';
    case 'new':
      return '/almanac/context/new';
    case 'slip-stop':
      return { pathname: '/almanac/slip', params: { kind: 'stop' } };
    case 'slip-start': {
      const context = state.tree.ordered.find((c) => c.name.toLowerCase() === (arg ?? 'dog').toLowerCase());
      return { pathname: '/almanac/slip', params: { kind: 'start', context: context?.id ?? '' } };
    }
    case 'edit': {
      const context = state.tree.ordered.find((c) => c.name.toLowerCase() === (arg ?? 'job').toLowerCase());
      return context ? `/almanac/context/${context.id}` : '/almanac/contexts';
    }
    case 'entry': {
      const entry: { id: EntryId } | undefined = state.entries[state.entries.length - 2] ?? state.entries[0];
      return entry ? `/almanac/entry/${entry.id}` : '/almanac';
    }
    case 'gap': {
      // The first real gap of ten minutes or more between two closed entries.
      const closed = state.entries.filter((e) => e.endUtc !== null);
      const i = closed.findIndex((e, k) => k + 1 < closed.length && closed[k + 1].startUtc - (e.endUtc ?? 0) >= 10 * MINUTE);
      if (i < 0) return '/almanac';
      const from = closed[i].endUtc ?? 0;
      const to = closed[i + 1].startUtc;
      return { pathname: '/almanac/pick', params: { for: 'gap', from: String(from), to: String(to), at: String(from) } };
    }
    default:
      return '/almanac';
  }
}
