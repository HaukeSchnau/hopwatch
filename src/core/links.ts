// Deep links for Shortcuts, the Action Button and Siri:
//   stintfive://start?context=<id>   switch to that context
//   stintfive://stop                 stop the running entry
//   stintfive://resume               start the previous context again

import type { ContextId } from './model';

// TODO: switch to 'stint' once one direction becomes the real app; 'stintfive' lets this
// evaluation build live next to other Stint builds on the same phone.
export const SCHEME = 'stintfive';

export type LinkAction = { kind: 'start'; contextId: ContextId } | { kind: 'stop' } | { kind: 'resume' };

/** Parses a URL or router path such as "stint://start?context=…" or "/stop". */
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
