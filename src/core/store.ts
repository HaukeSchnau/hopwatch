// The app state and every action that changes it. Screens read through the hooks in
// hooks.ts and write only through `actions`; entries change only via timeline.ts.

import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';

import * as db from './db';
import { type DirectionId, isDirectionId } from './directions';
import type { LinkAction } from './links';
import type { Context, ContextId, Entry, EntryId, Hue } from './model';
import * as timeline from './timeline';
import { offsetAt } from './time';
import * as tree from './tree';

/** The most recent timeline change, for the "Switched to X · Undo" toast. */
export interface LastAction {
  kind: 'start' | 'stop' | 'back' | 'resume' | 'edit' | 'delete' | 'fill';
  /** Ready-made toast text, e.g. "Switched to Dog". */
  label: string;
  contextId: ContextId | null;
  at: number;
  undoRows: Entry[];
}

/** Something outside the app asked a screen to do something. */
export type Intent = { kind: 'stop-sheet' };

export interface StintState {
  ready: boolean;
  /** Live contexts, archived ones included. */
  contexts: readonly Context[];
  /** Live entries sorted by start. */
  entries: readonly Entry[];
  /** Derived from contexts on every change. */
  tree: tree.ContextTree;
  direction: DirectionId | null;
  lastAction: LastAction | null;
  intent: Intent | null;
}

export const useStint = create<StintState>()(() => ({
  ready: false,
  contexts: [],
  entries: [],
  tree: tree.buildTree([]),
  direction: null,
  lastAction: null,
  intent: null,
}));

const get = useStint.getState;
const set = useStint.setState;

const clock = (): timeline.Clock => ({
  now: Date.now(),
  offsetAt,
  newId: () => randomUUID() as EntryId,
});

let pendingLinks: LinkAction[] = [];

/** Loads everything from SQLite. Synchronous, so the first frame has data. */
export function initStore() {
  if (get().ready) return;
  const { contexts, entries } = db.loadAll();
  const direction = db.getMeta('direction');
  set({
    ready: true,
    contexts,
    entries,
    tree: tree.buildTree(contexts),
    direction: isDirectionId(direction) ? direction : null,
  });
  const links = pendingLinks;
  pendingLinks = [];
  links.forEach(actions.handleLink);
}

function commitEntries(rows: Entry[], action: Omit<LastAction, 'at' | 'undoRows'> | null) {
  if (rows.length === 0) return;
  const now = Date.now();
  const before = get().entries;
  db.writeRows({ entries: rows });
  set({
    entries: timeline.applyRows(before, rows),
    lastAction: action && { ...action, at: now, undoRows: timeline.inverse(before, rows, now) },
  });
}

function commitContexts(rows: Context[]) {
  if (rows.length === 0) return;
  db.writeRows({ contexts: rows });
  const byId = new Map(get().contexts.map((c) => [c.id, c]));
  for (const row of rows) {
    if (row.deletedAt === null) byId.set(row.id, row);
    else byId.delete(row.id);
  }
  const contexts = [...byId.values()];
  set({ contexts, tree: tree.buildTree(contexts) });
}

const nameOf = (id: ContextId | null) => (id && get().tree.byId.get(id)?.name) ?? 'context';
const findContext = (id: ContextId) => get().contexts.find((c) => c.id === id);

function updateContextRow(id: ContextId, change: (c: Context, now: number) => Context) {
  const c = findContext(id);
  if (c) commitContexts([change(c, Date.now())]);
}

export interface ContextPatch {
  name?: string;
  color?: Hue | null;
  emoji?: string | null;
  weeklyTargetMinutes?: number | null;
  nudgeAfterMinutes?: number | null;
}

export const actions = {
  /** Switches to a context. `at` backdates the start. */
  start(contextId: ContextId, opts: { at?: number } = {}) {
    const rows = timeline.start(get().entries, contextId, clock(), opts.at);
    commitEntries(rows, { kind: 'start', label: `Switched to ${nameOf(contextId)}`, contextId });
  },

  /** Stops the running entry. `at` backdates the stop. */
  stop(opts: { at?: number } = {}) {
    const open = timeline.findOpen(get().entries);
    const rows = timeline.stop(get().entries, clock(), opts.at);
    commitEntries(rows, { kind: 'stop', label: `Stopped ${nameOf(open?.contextId ?? null)}`, contextId: open?.contextId ?? null });
  },

  /**
   * "Back to X" while something runs, "Resume X" when nothing does. The target is
   * the same one `useSwitchTarget` shows.
   */
  back(opts: { at?: number } = {}) {
    const id = timeline.previousContextId(get().entries);
    if (!id || get().tree.byId.get(id)?.hidden) return;
    const running = timeline.findOpen(get().entries) !== null;
    const rows = timeline.start(get().entries, id, clock(), opts.at);
    commitEntries(rows, {
      kind: running ? 'back' : 'resume',
      label: `${running ? 'Back to' : 'Resumed'} ${nameOf(id)}`,
      contextId: id,
    });
  },

  /** Reverts the last timeline change. */
  undo() {
    const last = get().lastAction;
    if (!last) return;
    const now = Date.now();
    commitEntries(
      last.undoRows.map((r) => ({ ...r, updatedAt: now })),
      null,
    );
  },

  updateEntry(id: EntryId, patch: timeline.EntryPatch) {
    const rows = timeline.update(get().entries, id, patch, clock());
    const entry = rows.find((r) => r.id === id);
    commitEntries(rows, { kind: 'edit', label: 'Entry updated', contextId: entry?.contextId ?? null });
  },

  deleteEntry(id: EntryId) {
    const entry = get().entries.find((e) => e.id === id);
    const rows = timeline.remove(get().entries, id, clock());
    commitEntries(rows, { kind: 'delete', label: `Deleted ${nameOf(entry?.contextId ?? null)}`, contextId: entry?.contextId ?? null });
  },

  /** Creates an entry for [from, to], clamped to the gap it falls into. */
  fillGap(contextId: ContextId, from: number, to: number) {
    const rows = timeline.fillGap(get().entries, contextId, from, to, clock());
    commitEntries(rows, { kind: 'fill', label: `Added ${nameOf(contextId)}`, contextId });
  },

  /** Hides the undo toast without undoing. */
  dismissLastAction() {
    set({ lastAction: null });
  },

  createContext(input: Omit<tree.NewContextInput, 'id'>): ContextId {
    const id = randomUUID() as ContextId;
    commitContexts(tree.createContext(get().contexts, { ...input, id }, Date.now()));
    return id;
  },

  updateContext(id: ContextId, patch: ContextPatch) {
    updateContextRow(id, (c, now) => ({ ...c, ...patch, name: patch.name?.trim() || c.name, updatedAt: now }));
  },

  /** Moves a context under `parentId` (null for root) at `index` among its siblings. */
  moveContext(id: ContextId, parentId: ContextId | null, index = Number.MAX_SAFE_INTEGER) {
    commitContexts(tree.moveContext(get().contexts, id, parentId, index, Date.now()));
  },

  pin(id: ContextId) {
    const slot = tree.nextFreePin(get().contexts);
    updateContextRow(id, (c, now) => (c.pinPosition === null ? { ...c, pinPosition: slot, updatedAt: now } : c));
  },

  unpin(id: ContextId) {
    updateContextRow(id, (c, now) => ({ ...c, pinPosition: null, updatedAt: now }));
  },

  /** Moves a pinned tile to `slot`, swapping with whatever is there. */
  movePin(id: ContextId, slot: number) {
    commitContexts(tree.movePin(get().contexts, id, slot, Date.now()));
  },

  archive(id: ContextId) {
    updateContextRow(id, tree.archive);
  },

  unarchive(id: ContextId) {
    updateContextRow(id, tree.unarchive);
  },

  /** Deletes a context without entries or children, and archives any other. */
  deleteContext(id: ContextId): 'deleted' | 'archived' {
    if (tree.canDelete(get().contexts, get().entries, id)) {
      updateContextRow(id, (c, now) => ({ ...c, deletedAt: now, pinPosition: null, updatedAt: now }));
      return 'deleted';
    }
    updateContextRow(id, tree.archive);
    return 'archived';
  },

  setDirection(direction: DirectionId) {
    db.setMeta('direction', direction);
    set({ direction });
  },

  /** Runs a deep link action now, or once the store has loaded. */
  handleLink(link: LinkAction) {
    if (!get().ready) {
      pendingLinks.push(link);
      return;
    }
    if (link.kind === 'start') {
      if (get().tree.byId.get(link.contextId)) actions.start(link.contextId);
    } else if (link.kind === 'stop') actions.stop();
    else actions.back();
  },

  setIntent(intent: Intent | null) {
    set({ intent });
  },

  /** Returns the pending intent and clears it, so only one screen reacts. */
  consumeIntent(): Intent | null {
    const intent = get().intent;
    if (intent) set({ intent: null });
    return intent;
  },

  /** Replaces all data with the given rows. Used by sample data and erase. */
  replaceAll(data: { contexts: Context[]; entries: Entry[] }) {
    db.eraseAll();
    db.writeRows(data);
    const contexts = data.contexts.filter((c) => c.deletedAt === null);
    set({
      contexts,
      entries: timeline.applyRows([], data.entries),
      tree: tree.buildTree(contexts),
      lastAction: null,
    });
  },
};
