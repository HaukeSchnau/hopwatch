// The Week (and its day mode): an editorial spread. A big total, targets written as
// sentences over printed bars, the totals tree, and the week as small multiples.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDays,
  type ContextId,
  type DayReport,
  formatDuration,
  formatTargetLine,
  formatWeekday,
  formatWeekRange,
  startOfDay,
  startOfWeek,
  type TargetLine,
  type Totals,
  type TotalsNode,
  totalsText,
  useNow,
  useStint,
  useWeekReport,
} from '@/core';

import { dayParam } from './dates';
import { DayStrip } from './DayStrip';
import { PageHeader } from './PageHeader';
import { Paper } from './Paper';
import { PrintedBar } from './PrintedBar';
import { font, ink, margin, riso } from './theme';
import { Caps, Leader, Rule } from './type';
import { formatDateline, numberWord, spellDuration, targetVerdict } from './words';

export type ReportMode = 'week' | 'day';

export function ReportPage({ mode, anchor }: { mode: ReportMode; anchor: number }) {
  const insets = useSafeAreaInsets();
  const now = useNow(60_000);
  const weekStart = startOfWeek(anchor);
  const week = useWeekReport(weekStart);
  const day = week.days.find((d) => d.start === startOfDay(anchor)) ?? week.days[0];
  const range = mode === 'week' ? { start: week.start, end: week.end } : { start: day.start, end: day.end };
  const isCurrent = now >= range.start && now < range.end;
  const step = mode === 'week' ? 7 : 1;
  const printKey = `${mode}-${range.start}`;

  const go = (params: { mode?: ReportMode; date?: string }) => {
    Haptics.selectionAsync();
    router.setParams(params);
  };

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 100, paddingHorizontal: margin }}>
        <PageHeader title={mode === 'week' ? 'The Week' : 'The Day’s Totals'} folio="p. 3" />
        <View style={styles.controls}>
          <View style={styles.modes}>
            {(['week', 'day'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                hitSlop={8}
                onPress={() => go({ mode: m })}
                style={[styles.mode, mode === m && styles.modeActive]}>
                <Caps color={mode === m ? ink.full : ink.faint} size={12}>
                  {m}
                </Caps>
              </Pressable>
            ))}
          </View>
          <View style={styles.nav}>
            <NavArrow glyph="‹" label="Earlier" onPress={() => go({ date: dayParam(addDays(anchor, -step)) })} />
            <Text style={styles.navLabel} numberOfLines={1}>
              {mode === 'week' ? formatWeekRange(week.start) : `${formatWeekday(day.start)} ${new Date(day.start).getDate()}`}
            </Text>
            <NavArrow
              glyph="›"
              label="Later"
              disabled={range.end > now}
              onPress={() => go({ date: dayParam(addDays(anchor, step)) })}
            />
          </View>
        </View>
        <Rule />

        <View style={styles.hero}>
          <Text style={styles.total} numberOfLines={1}>
            {formatDuration(mode === 'week' ? week.totals.total : day.totals.total)}
          </Text>
          <Text style={styles.totalCaption}>
            on the record{' '}
            {mode === 'week'
              ? isCurrent
                ? 'this week so far'
                : `in the week of ${formatWeekRange(week.start)}`
              : isCurrent
                ? 'today so far'
                : `on ${formatDateline(day.start)}`}
            .
          </Text>
          {mode === 'day' && <Fragments day={day} />}
        </View>

        {mode === 'day' && (
          <View style={styles.section}>
            <DayStrip report={day} now={now} height={22} ticks />
          </View>
        )}

        {mode === 'week' && week.targets.length > 0 && (
          <View style={styles.section}>
            <SectionHead title="Targets" note="weekly" />
            {week.targets.map((line, i) => (
              <Target key={line.context.id} line={line} running={isCurrent} printKey={printKey} delay={i * 90} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <SectionHead title="Where it went" note="tap to open, copy for invoices" />
          <TotalsTree totals={mode === 'week' ? week.totals : day.totals} range={range} printKey={printKey} />
        </View>

        {mode === 'week' && (
          <View style={styles.section}>
            <SectionHead title="Day by day" note="blocks · median" />
            {week.days.map((d) => (
              <DayLine key={d.start} day={d} now={now} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NavArrow({ glyph, label, onPress, disabled }: { glyph: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.arrow, disabled && { opacity: 0.2 }, pressed && { opacity: 0.5 }]}>
      <Text style={styles.arrowText}>{glyph}</Text>
    </Pressable>
  );
}

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Caps color={ink.full}>{title}</Caps>
      {note && <Caps color={ink.faint}>{note}</Caps>}
    </View>
  );
}

/** "Nine blocks; the median one ran 0:34." */
function Fragments({ day }: { day: DayReport }) {
  const { blocks, median } = day.fragmentation;
  if (blocks === 0) return <Text style={styles.fragments}>Not a single block.</Text>;
  if (blocks === 1)
    return (
      <Text style={styles.fragments}>
        One block, <Text style={styles.fragmentsFigure}>{formatDuration(median)}</Text> long. Admirably unfragmented.
      </Text>
    );
  const count = numberWord(blocks);
  return (
    <Text style={styles.fragments}>
      {count[0].toUpperCase() + count.slice(1)} {blocks === 1 ? 'block' : 'blocks'}; the median one ran{' '}
      <Text style={styles.fragmentsFigure}>{formatDuration(median)}</Text>.
    </Text>
  );
}

/** "Job: 36:40 of 40:00, three hours twenty short." over a bar with the target ticked. */
function Target({ line, running, printKey, delay }: { line: TargetLine; running: boolean; printKey: string; delay: number }) {
  const scale = Math.max(line.actual, line.target, 1);
  const verdict = line.diff < 0 && running ? `${spellDuration(line.diff)} to go` : targetVerdict(line.diff);
  return (
    <View style={styles.target}>
      <Text style={styles.targetSentence}>
        <Text style={{ fontFamily: font.displayItalic, color: riso[line.context.hue].type }}>{line.context.name}</Text>:{' '}
        {formatDuration(line.actual)} of {formatDuration(line.target)}, {verdict}.
      </Text>
      <View style={styles.targetBar}>
        <PrintedBar
          hue={line.context.hue}
          fraction={line.actual / scale}
          marker={line.target / scale}
          height={14}
          delay={delay}
          printKey={printKey}
        />
      </View>
      <Caps color={ink.faint} size={10}>
        {formatTargetLine(line)}
      </Caps>
    </View>
  );
}

/** The expandable tree of totals; each node's figure includes its whole subtree. */
function TotalsTree({ totals, range, printKey }: { totals: Totals; range: { start: number; end: number }; printKey: string }) {
  const [open, setOpen] = useState<ReadonlySet<ContextId>>(() => new Set());
  const max = Math.max(1, ...totals.roots.map((r) => r.total));
  if (totals.roots.length === 0) return <Text style={styles.empty}>Nothing on the record here. Gaps are allowed.</Text>;

  const toggle = (id: ContextId) => {
    Haptics.selectionAsync();
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  let row = 0;
  const render = (node: TotalsNode): ReactNode => {
    const index = row++;
    const isOpen = open.has(node.context.id);
    return (
      <View key={node.context.id}>
        <TotalsRow node={node} max={max} open={isOpen} onPress={() => toggle(node.context.id)} delay={index * 45} printKey={printKey} range={range} />
        {isOpen && node.children.map(render)}
      </View>
    );
  };
  return <View>{totals.roots.map(render)}</View>;
}

function TotalsRow({
  node,
  max,
  open,
  onPress,
  delay,
  printKey,
  range,
}: {
  node: TotalsNode;
  max: number;
  open: boolean;
  onPress: () => void;
  delay: number;
  printKey: string;
  range: { start: number; end: number };
}) {
  const { context } = node;
  const hasChildren = node.children.length > 0;
  const indent = context.depth * 18;
  return (
    <View style={[styles.totalsRow, { paddingLeft: indent }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${context.name}, ${formatDuration(node.total)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.totalsPress, pressed && { opacity: 0.55 }]}>
        <View style={styles.totalsLine}>
          <Text style={styles.totalsMark}>{hasChildren ? (open ? '−' : '+') : '·'}</Text>
          <Text style={[styles.totalsName, context.depth === 0 && styles.totalsRoot, context.hidden && { color: ink.soft }]} numberOfLines={1}>
            {context.glyph ? `${context.glyph} ` : ''}
            {context.name}
            {context.archivedAt !== null && <Text style={styles.archived}> archived</Text>}
          </Text>
          <Leader />
          <Text style={[styles.totalsFigure, context.depth === 0 && styles.totalsFigureRoot]}>{formatDuration(node.total)}</Text>
        </View>
        <View style={styles.totalsBar}>
          <PrintedBar hue={context.hue} fraction={node.total / max} height={context.depth === 0 ? 10 : 7} delay={delay} printKey={printKey} />
        </View>
      </Pressable>
      {open && <CopyLink contextId={context.id} range={range} name={context.name} />}
    </View>
  );
}

/** Copies one context's totals for the range as plain text, for client hours. */
function CopyLink({ contextId, range, name }: { contextId: ContextId; range: { start: number; end: number }; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy ${name} totals for an invoice`}
      hitSlop={6}
      onPress={async () => {
        const { entries, tree } = useStint.getState();
        await Clipboard.setStringAsync(totalsText(entries, tree, contextId, range, Date.now()));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      style={({ pressed }) => [styles.copy, pressed && { opacity: 0.5 }]}>
      <Text style={styles.copyText}>{copied ? 'Copied to the clipboard ✓' : `Copy ${name} for an invoice →`}</Text>
    </Pressable>
  );
}

/** One day of the week as a small multiple: name, strip, total and fragmentation. */
function DayLine({ day, now }: { day: DayReport; now: number }) {
  const future = day.start > now;
  const d = new Date(day.start);
  const { blocks, median } = day.fragmentation;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open ${formatDateline(day.start)}`}
      disabled={future}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({ pathname: '/almanac/day', params: { date: dayParam(day.start) } });
      }}
      style={({ pressed }) => [styles.dayLine, future && { opacity: 0.35 }, pressed && { opacity: 0.55 }]}>
      <View style={styles.dayName}>
        <Text style={styles.dayWeekday}>{formatWeekday(day.start)}</Text>
        <Text style={styles.dayDate}>{d.getDate()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <DayStrip report={day} now={now} height={12} />
        <Caps color={ink.faint} size={9.5} style={{ marginTop: 5 }}>
          {blocks > 0 ? `${blocks} ${blocks === 1 ? 'block' : 'blocks'} · median ${formatDuration(median)}` : future ? 'to come' : 'nothing on file'}
        </Caps>
      </View>
      <Text style={styles.dayTotal}>{day.totals.total > 0 ? formatDuration(day.totals.total) : '–'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  modes: { flexDirection: 'row', gap: 18 },
  mode: { minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  modeActive: { borderBottomColor: ink.full },
  nav: { flexDirection: 'row', alignItems: 'center' },
  navLabel: { fontFamily: font.displayItalic, fontSize: 21, color: ink.full, minWidth: 96, textAlign: 'center' },
  arrow: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: font.display, fontSize: 34, lineHeight: 38, color: ink.full },

  hero: { paddingTop: 12, paddingBottom: 8 },
  total: { fontFamily: font.display, fontSize: 112, lineHeight: 118, color: ink.full, letterSpacing: -2 },
  totalCaption: { marginTop: -6, fontFamily: font.textItalic, fontSize: 18, lineHeight: 24, color: ink.soft },
  fragments: { marginTop: 10, fontFamily: font.text, fontSize: 18, lineHeight: 25, color: ink.full },
  fragmentsFigure: { fontFamily: font.textMedium },

  section: { marginTop: 30 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: ink.full,
    marginBottom: 6,
  },

  target: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.rule },
  targetSentence: { fontFamily: font.display, fontSize: 25, lineHeight: 29, color: ink.full },
  targetBar: { marginTop: 10, marginBottom: 8 },

  totalsRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.rule },
  totalsPress: { paddingTop: 10, paddingBottom: 10, minHeight: 50 },
  totalsLine: { flexDirection: 'row', alignItems: 'baseline' },
  totalsMark: { width: 16, fontFamily: font.display, fontSize: 20, color: ink.soft },
  totalsName: { flexShrink: 1, fontFamily: font.display, fontSize: 20, color: ink.full },
  totalsRoot: { fontSize: 23 },
  archived: { fontFamily: font.textItalic, fontSize: 13, color: ink.faint },
  totalsFigure: { fontFamily: font.sans, fontSize: 14, color: ink.full, fontVariant: ['tabular-nums'] },
  totalsFigureRoot: { fontFamily: font.sansBold, fontSize: 15 },
  totalsBar: { marginTop: 7, marginLeft: 16 },
  copy: { alignSelf: 'flex-start', marginLeft: 16, marginBottom: 10, minHeight: 32, justifyContent: 'center' },
  copyText: { fontFamily: font.textItalic, fontSize: 16, color: ink.full, textDecorationLine: 'underline' },
  empty: { marginTop: 8, fontFamily: font.textItalic, fontSize: 17, color: ink.soft },

  dayLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ink.rule,
  },
  dayName: { width: 44 },
  dayWeekday: { fontFamily: font.display, fontSize: 22, lineHeight: 24, color: ink.full },
  dayDate: { fontFamily: font.sans, fontSize: 10.5, color: ink.soft, fontVariant: ['tabular-nums'] },
  dayTotal: { width: 52, textAlign: 'right', fontFamily: font.display, fontSize: 22, color: ink.full },
});
