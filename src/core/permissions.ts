// Notification permission for the forgotten-timer nudge. Asked once, at a calm moment:
// right after the first context exists (or sample data is loaded), not in the middle of
// the first switch. Directions may also call it themselves.

import * as Notifications from 'expo-notifications';

let asking: Promise<boolean> | null = null;

/** Asks for notification permission if it hasn't been decided yet. Resolves to granted. */
export function requestNudgePermission(): Promise<boolean> {
  asking ??= (async () => {
    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') ({ status } = await Notifications.requestPermissionsAsync());
    return status === 'granted';
  })().finally(() => {
    asking = null;
  });
  return asking;
}
