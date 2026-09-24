// The context tree: building it, resolving inherited settings, and the pure edits
// (create, move, pin, archive) that the store persists.

import {
  type Context,
  type ContextId,
  DEFAULT_HUE,
  DEFAULT_NUDGE_MINUTES,
  type Entry,
  type Hue,
} from './model';

/** A context with its inherited settings and position in the tree resolved. */
export interface ResolvedContext extends Context {
  /** Own color, else the nearest ancestor's, else DEFAULT_HUE. */
  hue: Hue;
  /** Own emoji, else the nearest ancestor's, else null. */
  glyph: string | null;
  /** Own nudge threshold, else the nearest ancestor's, else DEFAULT_NUDGE_MINUTES. */
  nudgeMinutes: number;
  depth: number;
  /** Ancestors from the root down to the parent. */
  ancestors: ResolvedContext[];
  /** Child ids in sibling order, archived children included. */
  childIds: ContextId[];
  /** True when this node or any ancestor is archived. */
  hidden: boolean;
}

export interface ContextTree {
  byId: ReadonlyMap<ContextId, ResolvedContext>;
  roots: ContextId[];
  /** Depth-first order, archived nodes included. */
  ordered: ResolvedContext[];
}

const bySortOrder = (a: Context, b: Context) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export function buildTree(contexts: Iterable<Context>): ContextTree {
  const live = [...contexts].filter((c) => c.deletedAt === null);
  const known = new Set(live.map((c) => c.id));
  const children = new Map<ContextId | null, Context[]>();
  for (const c of live) {
    // Orphans (parent deleted or missing) are shown as roots rather than lost.
    const parent = c.parentId && known.has(c.parentId) ? c.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), c]);
  }
  for (const list of children.values()) list.sort(bySortOrder);

  const byId = new Map<ContextId, ResolvedContext>();
  const ordered: ResolvedContext[] = [];
  const visit = (c: Context, parent: ResolvedContext | null) => {
    const node: ResolvedContext = {
      ...c,
      hue: c.color ?? parent?.hue ?? DEFAULT_HUE,
      glyph: c.emoji ?? parent?.glyph ?? null,
      nudgeMinutes: c.nudgeAfterMinutes ?? parent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES,
      depth: parent ? parent.depth + 1 : 0,
      ancestors: parent ? [...parent.ancestors, parent] : [],
      childIds: (children.get(c.id) ?? []).map((child) => child.id),
      hidden: c.archivedAt !== null || (parent?.hidden ?? false),
    };
    byId.set(c.id, node);
    ordered.push(node);
    for (const child of children.get(c.id) ?? []) visit(child, node);
  };
  const roots = children.get(null) ?? [];
  for (const root of roots) visit(root, null);
  return { byId, roots: roots.map((r) => r.id), ordered };
}

/** The node and all of its descendants. */
export function subtreeIds(tree: ContextTree, id: ContextId): Set<ContextId> {
  const ids = new Set<ContextId>();
  const walk = (current: ContextId) => {
    ids.add(current);
    for (const child of tree.byId.get(current)?.childIds ?? []) walk(child);
  };
  walk(id);
  return ids;
}

/** "Clients › Acme › Website" */
export const pathLabel = (node: ResolvedContext, separator = ' › ') =>
  [...node.ancestors.map((a) => a.name), node.name].join(separator);

/** Contexts that can be started from pickers: not archived and not under an archived node. */
export const pickable = (tree: ContextTree) => tree.ordered.filter((c) => !c.hidden);

// Pure edits. Each returns the full rows to persist.

export interface NewContextInput {
  id: ContextId;
  name: string;
  parentId?: ContextId | null;
  color?: Hue | null;
  emoji?: string | null;
  pinned?: boolean;
}

export function createContext(contexts: readonly Context[], input: NewContextInput, now: number): Context[] {
  const parentId = input.parentId ?? null;
  const siblings = contexts.filter((c) => c.deletedAt === null && c.parentId === parentId);
  const context: Context = {
    id: input.id,
    parentId,
    name: input.name.trim(),
    color: input.color ?? null,
    emoji: input.emoji ?? null,
    pinPosition: input.pinned ? nextFreePin(contexts) : null,
    sortOrder: Math.max(-1, ...siblings.map((c) => c.sortOrder)) + 1,
    weeklyTargetMinutes: null,
    nudgeAfterMinutes: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  return [context];
}

/** The lowest free pin slot, so pinning never shifts existing tiles. */
export function nextFreePin(contexts: readonly Context[]): number {
  const taken = new Set(contexts.filter((c) => c.deletedAt === null && c.pinPosition !== null).map((c) => c.pinPosition));
  let slot = 0;
  while (taken.has(slot)) slot++;
  return slot;
}

/**
 * Moves a pinned context to `slot`. A context already in that slot takes the
 * vacated one, so every other tile keeps its place.
 */
export function movePin(contexts: readonly Context[], id: ContextId, slot: number, now: number): Context[] {
  const moving = contexts.find((c) => c.id === id);
  if (!moving || moving.pinPosition === slot) return [];
  const occupant = contexts.find((c) => c.deletedAt === null && c.pinPosition === slot && c.id !== id);
  const rows: Context[] = [{ ...moving, pinPosition: slot, updatedAt: now }];
  if (occupant) rows.push({ ...occupant, pinPosition: moving.pinPosition, updatedAt: now });
  return rows;
}

/**
 * Moves a context under a new parent at `index` among its new siblings. Returns no
 * rows when the move would create a cycle.
 */
export function moveContext(
  contexts: readonly Context[],
  id: ContextId,
  parentId: ContextId | null,
  index: number,
  now: number,
): Context[] {
  const moving = contexts.find((c) => c.id === id);
  if (!moving) return [];
  const tree = buildTree(contexts);
  if (parentId !== null && subtreeIds(tree, id).has(parentId)) return [];

  const siblings = contexts
    .filter((c) => c.deletedAt === null && c.parentId === parentId && c.id !== id)
    .sort(bySortOrder);
  const clamped = Math.max(0, Math.min(index, siblings.length));
  const order = [...siblings.slice(0, clamped), moving, ...siblings.slice(clamped)];
  return order.flatMap((c, sortOrder) => {
    const changed = c.id === id ? { ...c, parentId, sortOrder } : { ...c, sortOrder };
    return c.sortOrder === sortOrder && c.id !== id ? [] : [{ ...changed, updatedAt: now }];
  });
}

/** Archiving also frees the pin slot; the history stays. */
export const archive = (c: Context, now: number): Context => ({ ...c, archivedAt: now, pinPosition: null, updatedAt: now });

export const unarchive = (c: Context, now: number): Context => ({ ...c, archivedAt: null, updatedAt: now });

/** A context without entries and without children can be deleted; others are archived. */
export function canDelete(contexts: readonly Context[], entries: readonly Entry[], id: ContextId): boolean {
  const hasChildren = contexts.some((c) => c.deletedAt === null && c.parentId === id);
  const hasEntries = entries.some((e) => e.contextId === id);
  return !hasChildren && !hasEntries;
}
