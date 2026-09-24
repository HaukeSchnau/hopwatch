import { parseLink } from '@/core/links';
import { actions, useStint } from '@/core/store';

/**
 * Runs stintfive://start, stop and resume as actions, then lands on the active
 * direction's home (or the Lab). Other paths route normally.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const link = parseLink(path);
    if (!link) return path;
    actions.handleLink(link);
    const direction = useStint.getState().direction;
    return direction ? `/${direction}` : '/lab';
  } catch {
    return '/';
  }
}
