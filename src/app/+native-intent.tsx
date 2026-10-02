import { systemSurfaces } from '@modules/system-surfaces';

import { initialLinkIsStale } from '@/core/launch';
import { parseLink } from '@/core/links';
import { actions } from '@/core/store';

/**
 * Runs hopwatch://start, stop and resume as actions, then lands on Now. Other paths route
 * normally. After an over-the-air reload the initial link is the one already handled before
 * the reload, so it only lands on Now (see src/core/launch.ts).
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    const link = parseLink(path);
    if (!link) return path;
    if (initial && initialLinkIsStale()) return '/';
    actions.handleLink(link);
    // Android: a link from the notification or a shortcut stays the activity's intent; run it once.
    systemSurfaces?.forgetLaunchLink();
    return '/';
  } catch {
    return '/';
  }
}
