// The native long-press menus for backdating. Anything that starts a jelly (tiles, beans,
// the back pill, rows in Stuff) offers "Started N min ago", "At a time…" and "Edit";
// Stop offers "Stopped N min ago" and "At a time…". The time sheets handle the rest.

import type { MenuAction } from '@expo/ui/community/menu';
import { router } from 'expo-router';

import { actions, type ContextId, formatClock, MINUTE, type ResolvedContext, useStint } from '@/core';

import { buzz, play } from './feedback';
import { noteSource } from './now/choreo';

const START_AGO = [5, 10, 15, 30, 45];
const STOP_AGO = [5, 10, 15, 30];

/** "5 min ago · 09:07" */
const agoTitle = (minutes: number, now: number) => `${minutes} min ago · ${formatClock(now - minutes * MINUTE)}`;

/**
 * Menu for anything that starts `context`. For the running context the same choices move
 * its start instead.
 */
export function startMenu(context: ResolvedContext, now: number, running: boolean): MenuAction[] {
  return [
    {
      id: 'ago',
      title: running ? 'Actually started' : 'Started earlier',
      displayInline: true,
      subactions: START_AGO.map((m) => ({ id: `ago:${m}`, title: agoTitle(m, now), image: 'clock.arrow.circlepath' })),
    },
    { id: 'at', title: 'At a time…', image: 'clock' },
    { id: 'edit', title: `Edit ${context.name}`, image: 'pencil' },
  ];
}

/**
 * Runs a start-menu choice. `source` names the anchor the blob hops out of, so a
 * backdated start still flies from the tile that was held.
 */
export function onStartMenu(contextId: ContextId, event: string, source?: string) {
  if (event.startsWith('ago:')) {
    const at = Date.now() - Number(event.slice(4)) * MINUTE;
    const open = useStint.getState().entries.find((e) => e.endUtc === null);
    const context = useStint.getState().tree.byId.get(contextId);
    buzz.success();
    if (open && open.contextId === contextId) {
      actions.updateEntry(open.id, { startUtc: at }, `${context?.name ?? 'It'} since ${formatClock(at)}`);
      return;
    }
    if (source) noteSource(contextId, source);
    actions.start(contextId, { at });
    play('pop');
  } else if (event === 'at') {
    router.push({ pathname: '/start', params: { context: contextId } });
  } else if (event === 'edit') {
    router.push({ pathname: '/context', params: { id: contextId } });
  }
}

/** Menu for Stop, limited to times after the entry started. */
export function stopMenu(since: number, now: number): MenuAction[] {
  const options = STOP_AGO.filter((m) => now - m * MINUTE > since);
  return [
    ...(options.length
      ? [
          {
            id: 'ago',
            title: 'Stopped earlier',
            displayInline: true,
            subactions: options.map((m) => ({ id: `ago:${m}`, title: agoTitle(m, now), image: 'clock.arrow.circlepath' as const })),
          },
        ]
      : []),
    { id: 'at', title: 'At a time…', image: 'clock' },
  ];
}

export function onStopMenu(event: string) {
  if (event.startsWith('ago:')) {
    buzz.success();
    actions.stop({ at: Date.now() - Number(event.slice(4)) * MINUTE });
    play('boop');
  } else if (event === 'at') {
    router.push('/stop');
  }
}
