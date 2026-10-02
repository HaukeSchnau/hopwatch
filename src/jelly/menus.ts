// The native long-press menus for backdating. Anything that starts a jelly (tiles, beans,
// the back pill, rows in Stuff) offers "Started N min ago", "At a time…" and "Edit";
// Stop offers "Stopped N min ago" and "At a time…". Each "N min ago" says under it what
// it would do ("Deep work stops at 14:50") before it's picked. The time sheets handle the rest.

import { router } from 'expo-router';

import {
  actions,
  type ContextId,
  type ContextTree,
  type Entry,
  formatClock,
  formatDuration,
  MIN_ENTRY_MS,
  MINUTE,
  previewStart,
  type ResolvedContext,
  useEntries,
  useHopwatch,
  useTree,
} from '@/core';
import { menuText } from '@/i18n/menus';

import { buzz, play } from './feedback';
import type { MenuEntry, MenuItem } from './Menu';
import { noteSource } from './now/choreo';

const AGO = [5, 10, 15, 30, 45];

const agoTitle = (minutes: number, now: number) => menuText.ago(minutes, formatClock(now - minutes * MINUTE));

const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * What starting `contextId` at `at` does to the other entries, in words: "Deep work stops
 * at 14:50 · replaces Lunch". Null when it leaves them alone. `replaces` is true when an
 * entry would disappear, which deserves a warning.
 */
export function startConsequence(
  entries: readonly Entry[],
  tree: ContextTree,
  contextId: ContextId,
  at: number,
  now: number,
): { text: string; replaces: boolean } | null {
  const { cut, replaced } = previewStart(entries, contextId, at, now);
  const name = (e: Entry) => tree.byId.get(e.contextId)?.name ?? menuText.something;
  const parts: string[] = [];
  if (cut) parts.push(menuText.cut(name(cut.entry), cut.entry.endUtc === null, formatClock(cut.at)));
  if (replaced.length === 1) parts.push(menuText.replaces(name(replaced[0])));
  if (replaced.length > 1) parts.push(menuText.replacesMany(replaced.length));
  return parts.length ? { text: capitalized(parts.join(' · ')), replaces: replaced.length > 0 } : null;
}

/** What stopping the entry that runs since `since` at `at` leaves: "0:40 of Deep work". */
export function stopConsequence(name: string, since: number, at: number): string {
  return at - since < MIN_ENTRY_MS ? menuText.tooShort(name) : menuText.stopLeaves(formatDuration(at - since), name);
}

/**
 * Menu for anything that starts `context`. For the running context the same choices move
 * its start instead.
 */
export function useStartMenu(context: ResolvedContext, now: number, running: boolean): MenuEntry[] {
  const entries = useEntries();
  const tree = useTree();
  // Only entries that end after the earliest choice can be touched; Stuff renders a menu per row.
  const earliest = now - Math.max(...AGO) * MINUTE;
  const recent = entries.filter((e) => (e.endUtc ?? now) > earliest);
  const ago = AGO.map((m): MenuItem => {
    const consequence = startConsequence(recent, tree, context.id, now - m * MINUTE, now);
    return {
      id: `ago:${m}`,
      title: agoTitle(m, now),
      subtitle: consequence?.text,
      image: consequence?.replaces ? 'exclamationmark.triangle' : 'clock.arrow.circlepath',
    };
  });
  return [
    { title: running ? menuText.actuallyStarted : menuText.startedEarlier, items: ago },
    { id: 'at', title: menuText.atTime, image: 'clock' },
    { id: 'edit', title: menuText.edit(context.name), image: 'pencil' },
  ];
}

/**
 * Runs a start-menu choice. `source` names the anchor the blob hops out of, so a
 * backdated start still flies from the tile that was held.
 */
export function onStartMenu(contextId: ContextId, event: string, source?: string) {
  if (event.startsWith('ago:')) {
    const at = Date.now() - Number(event.slice(4)) * MINUTE;
    const open = useHopwatch.getState().entries.find((e) => e.endUtc === null);
    const context = useHopwatch.getState().tree.byId.get(contextId);
    buzz.success();
    if (open && open.contextId === contextId) {
      actions.updateEntry(open.id, { startUtc: at }, menuText.movedStart(context?.name, formatClock(at)));
      return;
    }
    if (source) noteSource(contextId, source);
    actions.start(contextId, { at });
    play('pop');
  } else if (event === 'at') {
    router.push({ pathname: '/start', params: { context: contextId } });
  } else if (event === 'edit') {
    router.push({ pathname: '/context', params: { id: contextId } });
  }
}

/** Menu for stopping `name`, which runs since `since`; limited to times after it started. */
export function stopMenu(name: string, since: number, now: number): MenuEntry[] {
  const ago = AGO.filter((m) => now - m * MINUTE > since).map(
    (m): MenuItem => ({
      id: `ago:${m}`,
      title: agoTitle(m, now),
      subtitle: stopConsequence(name, since, now - m * MINUTE),
      image: 'clock.arrow.circlepath',
    }),
  );
  return [...(ago.length ? [{ title: menuText.stoppedEarlier, items: ago }] : []), { id: 'at', title: menuText.atTime, image: 'clock' }];
}

export function onStopMenu(event: string) {
  if (event.startsWith('ago:')) {
    buzz.success();
    actions.stop({ at: Date.now() - Number(event.slice(4)) * MINUTE });
    play('boop');
  } else if (event === 'at') {
    router.push('/stop');
  }
}
