// A link that cold-started the app (a Live Activity or notification button, a shortcut)
// stays the platform's initial URL for the whole process. An over-the-air update reloads
// the JavaScript in that same process, and expo-router would hand the old link to
// +native-intent again: a second "stop", possibly of an entry started since. So
// src/shell/updates.ts marks the reload, and the next start skips its initial link once.

import * as db from './db';

const KEY = 'reloadForUpdate';
let stale: boolean | null = null;

/** Called right before an update reload, and again with false if the reload fails. */
export function markReloadForUpdate(on: boolean): void {
  db.setMeta(KEY, on ? '1' : null);
}

/**
 * True when this JavaScript start is an update reload, so its initial link was already
 * handled before. Reads and clears the mark on the first call of each start (initStore
 * calls it so the mark never outlives the reload).
 */
export function initialLinkIsStale(): boolean {
  if (stale === null) {
    stale = db.getMeta(KEY) !== null;
    if (stale) db.setMeta(KEY, null);
  }
  return stale;
}
