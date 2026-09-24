import { parseLink } from '@/core/links';
import { actions } from '@/core/store';

/**
 * Runs stint://start, stint://stop and stint://resume as actions, then lands on the
 * active direction's home. Other paths route normally.
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
