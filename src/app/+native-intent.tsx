import { parseLink } from '@/core/links';
import { actions } from '@/core/store';

/**
 * Runs hopwatch://start, stop and resume as actions, then lands on Now. Other paths route
 * normally.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const link = parseLink(path);
    if (!link) return path;
    actions.handleLink(link);
    return '/';
  } catch {
    return '/';
  }
}
