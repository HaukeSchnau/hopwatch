// Deep links for Shortcuts, the Action Button and Siri:
//   hopwatch://start?context=<id>   switch to that context
//   hopwatch://stop                 stop the running entry
//   hopwatch://resume               start the previous context again

import type { ContextId } from './model';

export const SCHEME = 'hopwatch';

export type LinkAction = { kind: 'start'; contextId: ContextId } | { kind: 'stop' } | { kind: 'resume' };

/** Parses a URL or router path such as "hopwatch://start?context=…" or "/stop". */
export function parseLink(pathOrUrl: string): LinkAction | null {
  const withoutScheme = pathOrUrl.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^\/+/, '');
  const [route, query = ''] = withoutScheme.split('?');
  const params = new Map(
    query
      .split('&')
      .filter(Boolean)
      .map((pair): [string, string] => {
        const [key, value = ''] = pair.split('=');
        return [decodeURIComponent(key), decodeURIComponent(value)];
      }),
  );
  switch (route.replace(/\/+$/, '')) {
    case 'start': {
      const contextId = params.get('context');
      return contextId ? { kind: 'start', contextId: contextId as ContextId } : null;
    }
    case 'stop':
      return { kind: 'stop' };
    case 'resume':
      return { kind: 'resume' };
    default:
      return null;
  }
}

export const startLink = (id: ContextId) => `${SCHEME}://start?context=${id}`;
export const stopLink = `${SCHEME}://stop`;
export const resumeLink = `${SCHEME}://resume`;
