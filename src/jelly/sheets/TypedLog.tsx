// Typed logging in the pick sheet: "2h deep work this morning", "lunch 12:30 to 13:15",
// "stopped at 5". Apple's on-device model pulls the parts out of the sentence and
// src/core/sentence.ts turns them into a plan. A row under "Find a jelly" says what it
// understood, and a card shows what will change before anything does, in the same words
// as the backdating menus. Without the model none of this shows up.

import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { generate, lastFailure } from '@modules/on-device-model';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  actions,
  type ContextId,
  type ContextTree,
  type Entry,
  findOpen,
  formatAgo,
  formatClock,
  formatDuration,
  formatRelativeDay,
  isSameDay,
  MINUTE,
  type Plan,
  previewPlace,
  previewStart,
  readSentence,
  type SentenceAnswer,
  sentenceRequest,
  useEntries,
  useNow,
  useStint,
  useTree,
} from '@/core';

import { buzz, play } from '../feedback';
import { stopConsequence } from '../menus';
import { tabular, text, useTheme } from '../theme';
import { JellyButton, Squishy } from '../ui';
import { pastAt, SheetHeader } from './parts';

/** Whether a search might be a sentence to log rather than a jelly to find. */
export function looksLikeSentence(query: string, matches: number): boolean {
  const q = query.trim();
  return q.length >= 3 && (matches === 0 || /\d/.test(q));
}

/**
 * The model's answer for `sentence`, asked 500 ms after typing stops. Undefined while
 * that's pending, null when the model failed or `enabled` is false.
 */
function useSentenceAnswer(sentence: string, enabled: boolean): SentenceAnswer | null | undefined {
  const trimmed = sentence.trim();
  const [asked, setAsked] = useState<{ sentence: string; answer: SentenceAnswer | null } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const timer = setTimeout(() => {
      generate(sentenceRequest(trimmed, useStint.getState().tree))
        .catch(() => null)
        .then((answer) => {
          if (__DEV__ && !answer) console.warn('typed logging:', lastFailure());
          if (live) setAsked({ sentence: trimmed, answer });
        });
    }, 500);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [enabled, trimmed]);
  if (!enabled) return null;
  return asked?.sentence === trimmed ? asked.answer : undefined;
}

interface Scene {
  tree: ContextTree;
  entries: readonly Entry[];
  now: number;
}

/** A plan in Stint's words: the headline, a detail line and the button. */
function words(plan: Plan, { tree, entries, now }: Scene) {
  const name = (id: ContextId) => tree.byId.get(id)?.name ?? 'Something';
  // "21:00", or "yesterday 21:00" for a start or stop before today.
  const when = (at: number) => `${isSameDay(at, now) ? '' : 'yesterday '}${formatClock(at)}`;
  if (plan.kind === 'place') {
    const span = `${formatClock(plan.from)}–${formatClock(plan.to)}`;
    return {
      title: `${name(plan.contextId)} ${span}`,
      detail: `${formatRelativeDay(plan.from, now)} · ${formatDuration(plan.to - plan.from)}`,
      button: `Log ${span}`,
    };
  }
  const open = findOpen(entries);
  if (plan.kind === 'stop') {
    const running = open ? name(open.contextId) : 'it';
    const atNow = now - plan.at < MINUTE;
    return {
      title: atNow ? `Stop ${running}` : `Stop ${running} at ${when(plan.at)}`,
      detail: open ? `Running since ${when(open.startUtc)}` : 'Nothing is running',
      button: atNow ? 'Stop now' : `Stop at ${formatClock(plan.at)}`,
    };
  }
  const atNow = now - plan.at < MINUTE;
  if (open?.contextId === plan.contextId) {
    return {
      title: `${name(plan.contextId)} since ${when(plan.at)}`,
      detail: `Running since ${when(open.startUtc)}`,
      button: `Move start to ${formatClock(plan.at)}`,
    };
  }
  return {
    title: atNow ? `Start ${name(plan.contextId)}` : `${name(plan.contextId)} since ${when(plan.at)}`,
    detail: atNow ? 'Now' : `Started ${formatAgo(now - plan.at)}`,
    button: atNow ? `Start ${name(plan.contextId)}` : `Start at ${formatClock(plan.at)}`,
  };
}

interface Change {
  text: string;
  /** cut: an entry gets shorter. gone: one disappears. note: anything else. */
  tone: 'cut' | 'gone' | 'note';
}

const toneIcon = { cut: 'scissors', gone: 'exclamationmark.triangle', note: 'checkmark' } as const;

/** What a plan does to the entries already there: "Replaces Cooking 12:10–12:40". */
function changesOf(plan: Plan, { tree, entries, now }: Scene): Change[] {
  const name = (e: Entry) => tree.byId.get(e.contextId)?.name ?? 'Something';
  const span = (e: Entry) => `${formatClock(e.startUtc)}–${e.endUtc === null ? 'now' : formatClock(e.endUtc)}`;
  const cut = (e: Entry, at: number): Change => ({ text: `${name(e)} ${e.endUtc === null ? 'stops' : 'ends'} at ${formatClock(at)}`, tone: 'cut' });
  const replaced = (list: Entry[]): Change[] =>
    list.length > 3 ? [{ text: `Replaces ${list.length} entries`, tone: 'gone' }] : list.map((e) => ({ text: `Replaces ${name(e)} ${span(e)}`, tone: 'gone' }));

  if (plan.kind === 'place') {
    const p = previewPlace(entries, plan.contextId, plan.from, plan.to, now);
    return [
      ...(p.ended ? [cut(p.ended.entry, p.ended.at)] : []),
      ...(p.split ? [{ text: `Takes ${formatClock(plan.from)}–${formatClock(plan.to)} out of ${name(p.split)}`, tone: 'cut' as const }] : []),
      ...replaced(p.replaced),
      ...(p.started ? [{ text: `${name(p.started.entry)} starts at ${formatClock(p.started.at)}`, tone: 'cut' as const }] : []),
    ];
  }
  if (plan.kind === 'start') {
    const p = previewStart(entries, plan.contextId, plan.at, now);
    return [...(p.cut ? [cut(p.cut.entry, p.cut.at)] : []), ...replaced(p.replaced)];
  }
  const open = findOpen(entries);
  if (!open) return [];
  const result = stopConsequence(name(open), open.startUtc, plan.at);
  return [{ text: result, tone: result.startsWith('Too short') ? 'gone' : 'note' }];
}

/** Why a plan, maybe with edited times, can't be done right now. */
function problemWith(plan: Plan, { tree, entries, now }: Scene): string | null {
  if (plan.kind === 'place') {
    if (plan.to <= plan.from) return 'It ends before it starts';
    if (plan.from >= now) return "That's still to come";
    if (Math.min(plan.to, now) - plan.from < MINUTE) return "That's too short";
    return null;
  }
  if (plan.at > now) return "That's still to come";
  if (plan.kind === 'start') return null;
  const open = findOpen(entries);
  if (!open) return 'Nothing is running';
  const name = tree.byId.get(open.contextId)?.name ?? 'It';
  return plan.at < open.startUtc ? `That's before ${name} started at ${formatClock(open.startUtc)}` : null;
}

function useScene(): Scene {
  return { tree: useTree(), entries: useEntries(), now: useNow(15_000) };
}

/**
 * Typed logging for a search: the model's answer, what it means against the entries now,
 * and whether the row has anything to show (it hides when the model failed or the text
 * isn't about time).
 */
export function useTypedLog(sentence: string, enabled: boolean) {
  const answer = useSentenceAnswer(sentence, enabled);
  const scene = useScene();
  const reading = answer ? readSentence(sentence, answer, scene) : null;
  return {
    sentence,
    answer,
    reading,
    plan: reading && 'plan' in reading ? reading.plan : null,
    shown: enabled && answer !== null && (answer === undefined || reading !== null),
  };
}
type TypedLog = ReturnType<typeof useTypedLog>;

/**
 * The row under the search field: "Reading…" while the model thinks, then the plan, or
 * why it can't be logged. Nothing when the model failed or the text isn't about time.
 */
export function LogRow({ log: { sentence, answer, reading, plan, shown }, onPress }: { log: TypedLog; onPress: (plan: Plan) => void }) {
  const t = useTheme();
  const scene = useScene();
  if (!shown) return null;
  const said = plan ? words(plan, scene) : null;
  const title = said?.title ?? (answer === undefined ? `Log “${sentence.trim()}”` : "Can't log that");
  const detail = said?.detail ?? (reading && 'problem' in reading ? reading.problem : 'Reading…');
  return (
    <Squishy
      amount={0.06}
      disabled={!plan}
      onPress={() => plan && onPress(plan)}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${detail}`}
      accessibilityHint={plan ? 'Shows what changes before logging' : undefined}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: t.candy.pink.tint }]}>
          {answer === undefined ? <ActivityIndicator color={t.c.pinkDeep} /> : <SymbolView name="sparkles" size={20} tintColor={t.c.pinkDeep} weight="bold" />}
        </View>
        <View style={styles.rowText}>
          <Text style={[text.body, tabular, { color: plan ? t.c.ink : t.c.muted }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[text.footnote, tabular, { color: t.c.muted }]} numberOfLines={1}>
            {detail}
          </Text>
        </View>
        {plan && <SymbolView name="chevron.right" size={14} tintColor={t.c.faint} weight="bold" />}
      </View>
    </Squishy>
  );
}

/** The day of `base` at the picked wall-clock time. */
function onDay(base: number, picked: Date): number {
  const d = new Date(base);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return d.getTime();
}

/**
 * The confirmation: the jelly, what will happen with times to adjust, and what that does
 * to the entries already there. Logging goes through the store, so the toast can undo it.
 */
export function LogConfirm({ plan: proposed, onDone, onCancel }: { plan: Plan; onDone: () => void; onCancel: () => void }) {
  const t = useTheme();
  const scene = useScene();
  const [plan, setPlan] = useState(proposed);
  const open = findOpen(scene.entries);
  const contextId = plan.kind === 'stop' ? open?.contextId : plan.contextId;
  const context = contextId ? (scene.tree.byId.get(contextId) ?? null) : null;
  const hue = context?.hue ?? 'pink';
  const said = words(plan, scene);
  const problem = problemWith(plan, scene);
  const changes = problem ? [] : changesOf(plan, scene);

  const apply = () => {
    if (problem) return buzz.warn();
    buzz.success();
    if (plan.kind === 'place') {
      actions.place(plan.contextId, plan.from, plan.to);
      play('pop');
    } else if (plan.kind === 'stop') {
      actions.stop({ at: plan.at });
      play('boop');
    } else if (open?.contextId === plan.contextId) {
      actions.updateEntry(open.id, { startUtc: plan.at }, `${context?.name ?? 'It'} since ${formatClock(plan.at)}`);
    } else {
      actions.start(plan.contextId, { at: plan.at });
      play('pop');
    }
    onDone();
  };

  const picker = (value: number, onChange: (d: Date) => void) => (
    <DateTimePicker
      value={new Date(value)}
      mode="time"
      display="compact"
      style={styles.picker}
      locale="en_GB"
      themeVariant={t.scheme}
      accentColor={t.candy[hue].ink}
      onValueChange={(_, d) => onChange(d)}
    />
  );

  return (
    <View style={[styles.card, { backgroundColor: t.c.card }]}>
      <SheetHeader context={context} title={said.title} subtitle={said.detail} mood={plan.kind === 'stop' ? 'asleep' : 'awake'} />
      <View style={styles.times}>
        {plan.kind === 'place' ? (
          <>
            <Text style={[text.headline, { color: t.c.ink }]}>From</Text>
            {picker(plan.from, (d) => setPlan({ ...plan, from: onDay(plan.from, d) }))}
            <Text style={[text.headline, { color: t.c.ink }]}>to</Text>
            {picker(plan.to, (d) => setPlan({ ...plan, to: Math.min(onDay(plan.to, d), scene.now) }))}
          </>
        ) : (
          <>
            <Text style={[text.headline, { color: t.c.ink }]}>{plan.kind === 'stop' ? 'Stopped at' : 'Started at'}</Text>
            {picker(plan.at, (d) => setPlan({ ...plan, at: pastAt(d, scene.now) }))}
          </>
        )}
      </View>
      <View style={styles.changes}>
        {problem ? (
          <ChangeLine text={problem} tone="gone" />
        ) : changes.length ? (
          changes.map((c) => <ChangeLine key={c.text} {...c} />)
        ) : (
          <ChangeLine text="Nothing else changes" tone="note" />
        )}
      </View>
      <JellyButton label={said.button} hue={hue} size="large" disabled={problem !== null} onPress={apply} style={styles.button} />
      <JellyButton label="Cancel" palette={t.plainCandy} onPress={onCancel} style={styles.cancel} />
    </View>
  );
}

function ChangeLine({ text: line, tone }: Change) {
  const t = useTheme();
  return (
    <View style={styles.change}>
      <SymbolView name={toneIcon[tone]} size={14} tintColor={tone === 'gone' ? t.c.danger : t.c.muted} weight="semibold" />
      <Text style={[text.subhead, tabular, styles.changeText, { color: t.c.ink }]}>{line}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 58, paddingHorizontal: 8, borderRadius: 18 },
  icon: { width: 44, height: 44, borderRadius: 22, marginRight: 6, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 1 },
  card: { marginTop: 14, borderRadius: 26, padding: 16 },
  times: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' },
  picker: { width: 92, height: 38 },
  changes: { marginTop: 14, gap: 8 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeText: { flex: 1 },
  button: { marginTop: 18 },
  cancel: { marginTop: 10 },
});
