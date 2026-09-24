// The long-press menus for backdating: "Started N min ago" on tiles and "Stopped N min
// ago" on Stop. Both end in "At a time…", which opens the backdate sheet.

import type { MenuAction } from '@expo/ui/community/menu';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { actions, type ContextId, MINUTE } from '@/core';

const START_OPTIONS = [5, 10, 15, 30, 45];
const STOP_OPTIONS = [5, 10, 15, 30];

/** Menu for a context tile or row: backdated starts, a precise time, and editing. */
export function startMenu(): MenuAction[] {
  return [
    {
      id: 'ago',
      title: 'Started earlier',
      displayInline: true,
      subactions: START_OPTIONS.map((m) => ({ id: `ago:${m}`, title: `${m} min ago`, image: 'clock.arrow.circlepath' })),
    },
    { id: 'at', title: 'At a Time…', image: 'clock' },
    { id: 'edit', title: 'Edit Context', image: 'pencil' },
  ];
}

export function onStartMenu(contextId: ContextId, event: string) {
  if (event.startsWith('ago:')) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.start(contextId, { at: Date.now() - Number(event.slice(4)) * MINUTE });
  } else if (event === 'at') {
    router.push({ pathname: '/glass/backdate', params: { mode: 'start', context: contextId } });
  } else if (event === 'edit') {
    router.push({ pathname: '/glass/context/[id]', params: { id: contextId } });
  }
}

/** Menu for Stop, limited to times after the entry started. */
export function stopMenu(elapsed: number): MenuAction[] {
  const options = STOP_OPTIONS.filter((m) => m * MINUTE < elapsed);
  return [
    ...(options.length
      ? [
          {
            id: 'ago',
            title: 'Stopped earlier',
            displayInline: true,
            subactions: options.map((m) => ({ id: `ago:${m}`, title: `${m} min ago`, image: 'clock.arrow.circlepath' as const })),
          },
        ]
      : []),
    { id: 'at', title: 'Pick a Time…', image: 'clock' },
  ];
}

export function onStopMenu(event: string) {
  if (event.startsWith('ago:')) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.stop({ at: Date.now() - Number(event.slice(4)) * MINUTE });
  } else if (event === 'at') {
    router.push({ pathname: '/glass/backdate', params: { mode: 'stop' } });
  }
}
