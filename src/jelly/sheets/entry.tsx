// What both platforms' entry sheets share: the draft of an entry's jelly, start and end,
// saved together on Done so a half-picked time never trims a neighbour, and the candy header.

import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  actions,
  type ContextId,
  type Entry,
  type EntryPatch,
  formatClock,
  formatDayMonth,
  formatDuration,
  formatWeekday,
  type ResolvedContext,
  useNow,
  usePickableContexts,
  useTree,
} from '@/core';
import { sheetsText } from '@/i18n/sheets';

import { Character } from '../Character';
import { buzz } from '../feedback';
import { useFace, useLively } from '../Gummy';
import { tabular, text, useTheme } from '../theme';

export function useEntryDraft(entry: Entry) {
  const tree = useTree();
  const pickable = usePickableContexts();
  const [contextId, setContextId] = useState<ContextId>(entry.contextId);
  const [start, setStart] = useState(entry.startUtc);
  const [end, setEnd] = useState(entry.endUtc);
  const now = useNow(60_000);
  const context = tree.byId.get(contextId) ?? null;
  const options = pickable.some((c) => c.id === contextId) || !context ? pickable : [context, ...pickable];
  const invalid = end !== null && end <= start;

  /** Saves what changed, with the note as typed, and closes the sheet. */
  const save = (typedNote: string) => {
    if (invalid) return buzz.warn();
    const patch: EntryPatch = {};
    if (contextId !== entry.contextId) patch.contextId = contextId;
    if (start !== entry.startUtc) patch.startUtc = start;
    if (end !== entry.endUtc) patch.endUtc = end;
    const typed = typedNote.trim() || null;
    if (typed !== entry.note) patch.note = typed;
    if (Object.keys(patch).length) {
      buzz.success();
      actions.updateEntry(entry.id, patch);
    }
    router.back();
  };

  /** Deletes the entry (the toast can undo it) and closes the sheet. */
  const remove = () => {
    buzz.thud();
    actions.deleteEntry(entry.id);
    router.back();
  };

  return { contextId, setContextId, start, setStart, end, setEnd, now, context, options, invalid, save, remove };
}

/** The candy header: the jelly, when it ran and for how long (ticking while it runs). */
export function EntryHeader({ width, context, start, end }: { width: number; context: ResolvedContext; start: number; end: number | null }) {
  const t = useTheme();
  const face = useFace(end === null ? 'awake' : 'asleep');
  useLively(face, end === null);
  const now = useNow(end === null ? 1000 : null);
  return (
    <View style={[styles.header, { width }]}>
      <Character context={context} size={76} face={face} />
      <View style={styles.titles}>
        {context.ancestors.length ? (
          <Text style={[text.caption, styles.path, { color: t.candy[context.hue].ink }]} numberOfLines={1}>
            {context.ancestors.map((a) => a.name).join(' › ')}
          </Text>
        ) : null}
        <Text style={[text.title3, { color: t.c.ink }]} numberOfLines={1}>
          {context.name}
        </Text>
        <Text style={[text.footnote, tabular, { color: t.c.muted }]} numberOfLines={1}>
          {formatWeekday(start)} {formatDayMonth(start)} · {formatClock(start)}–{end === null ? sheetsText.now : formatClock(end)}
        </Text>
      </View>
      <Text style={[styles.length, tabular, { color: t.c.ink }]}>{formatDuration(Math.max(0, (end ?? now) - start))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 8, paddingRight: 16 },
  titles: { flex: 1 },
  path: { textTransform: 'uppercase', letterSpacing: 0.5 },
  length: { fontFamily: 'ui-rounded', fontWeight: '800', fontSize: 24 },
});
