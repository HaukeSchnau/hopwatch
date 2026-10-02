// Notification permission for the forgotten-timer nudge. Onboarding asks once, right after
// the first jelly, sample data or a restored backup, and says why first (see Welcome). The
// nudge scheduler asks too if it's still undecided when a nudge is due.
//
// "Undecided" is `canAskAgain` rather than an `undetermined` status: Android 13 and later
// report `denied` before the first request. There, unlike on iOS, a single "Don't allow"
// still leaves one more ask, which the scheduler then uses.

import * as Notifications from 'expo-notifications';

let asking: Promise<boolean> | null = null;

/**
 * Asks for notification permission if it hasn't been decided yet. `explain` runs first and
 * resolves once the user has read why. Resolves to granted. A call while one is in flight
 * joins it, so the scheduler never shows the system prompt ahead of the explanation.
 */
export function requestNudgePermission(explain?: () => Promise<void>): Promise<boolean> {
  asking ??= (async () => {
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && canAskAgain) {
      await explain?.();
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    return status === 'granted';
  })().finally(() => {
    asking = null;
  });
  return asking;
}
