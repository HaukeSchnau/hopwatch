// The two ways any word in the Almanac starts the clock.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { actions, type ContextId } from '@/core';

/** Starts a context right now, with a firm tap of the haptic. */
export function switchTo(id: ContextId) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  actions.start(id);
}

/** Opens the backdating slip for a context: "started N minutes ago" or at a time. */
export function startEarlier(id: ContextId) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  router.push({ pathname: '/almanac/slip', params: { kind: 'start', context: id } });
}
