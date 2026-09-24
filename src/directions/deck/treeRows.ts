// Indentation guides for a depth-first list of contexts, like a file browser:
// "│" where an ancestor has more siblings below, "├" / "└" for the node itself.

import type { ContextId, ResolvedContext } from '@/core';

export type Guide = 'pipe' | 'blank';
export type Connector = 'tee' | 'elbow';

export interface TreeRow {
  context: ResolvedContext;
  /** One guide per level between the root and the node's parent. */
  guides: Guide[];
  /** Null for roots. */
  connector: Connector | null;
}

/** Guides for `nodes`, which must be in depth-first order with their ancestors present. */
export function treeRows(nodes: readonly ResolvedContext[]): TreeRow[] {
  const lastChild = new Map<ContextId | null, ContextId>();
  for (const node of nodes) lastChild.set(node.parentId, node.id);
  const isLast = (node: ResolvedContext) => lastChild.get(node.parentId) === node.id;

  return nodes.map((context) => ({
    context,
    guides: context.ancestors.slice(1).map((a): Guide => (isLast(a) ? 'blank' : 'pipe')),
    connector: context.depth === 0 ? null : isLast(context) ? 'elbow' : 'tee',
  }));
}
