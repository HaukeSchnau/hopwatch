// The front page: masthead, the lead story about what's running, "Back to X", the
// pinned board of words and the recents line. Switching is one tap on any word.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  formatClock,
  formatDuration,
  type ResolvedContext,
  startOfDay,
  useDayReport,
  useEntries,
  useNow,
  usePinned,
  useRecents,
  useRunning,
  useSwitchTarget,
  useTree,
} from '@/core';

import { startEarlier, switchTo } from './commands';
import { DayStrip } from './DayStrip';
import { InkCircle, InkUnderline, seedOf } from './InkCircle';
import { Elapsed, Stopwatch } from './live';
import { Paper } from './Paper';
import { RisoDot } from './Riso';
import { font, ink, margin, riso } from './theme';
import { Caps, InkLink, Rule } from './type';
import { type Token, Typeset } from './Typeset';
import { dayOfYear, formatDateline, isoWeek } from './words';

export function FrontPage() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Paper />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 96, paddingHorizontal: margin }}
        showsVerticalScrollIndicator={false}>
        <Masthead />
        <Lead />
        <BackLine />
        <Board />
        <Lately />
        <TodayStrip />
      </ScrollView>
    </View>
  );
}

function Masthead() {
  const now = useNow(60_000);
  return (
    <View>
      <View style={styles.mastRow}>
        <Text style={styles.ear}>{'All the time\nthat’s fit\nto print'}</Text>
        <Text style={styles.masthead} numberOfLines={1} adjustsFontSizeToFit>
          The Daily Stint
        </Text>
        <Text style={[styles.ear, { textAlign: 'right' }]}>{'Price:\none tap\nper switch'}</Text>
      </View>
      <Rule weight="heavy" />
      <View style={styles.dateline}>
        <Caps size={10.5} color={ink.full}>
          {formatDateline(now)}
        </Caps>
        <Caps size={10.5} color={ink.full}>
          Week {isoWeek(now)} · No. {dayOfYear(now)}
        </Caps>
      </View>
      <Rule weight="regular" />
      <View style={styles.sections}>
        <Section label="The Day" onPress={() => router.push('/almanac/day')} />
        <Section label="The Week" onPress={() => router.push('/almanac/week')} />
        <Section label="Index" onPress={() => router.push('/almanac/contexts')} />
        <Section label="Colophon" onPress={() => router.push('/almanac/colophon')} />
      </View>
      <Rule />
    </View>
  );
}

function Section({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => [styles.section, pressed && { opacity: 0.45 }]}>
      <Text style={styles.sectionText}>{label}</Text>
    </Pressable>
  );
}

/** The lead story: a sentence about right now, set huge, with Stop beside it. */
function Lead() {
  const running = useRunning();
  const entries = useEntries();
  const tree = useTree();
  const now = useNow(30_000);

  if (running) {
    const { context, entry } = running;
    const elapsed = now - entry.startUtc;
    const name: Token = {
      text: context.name,
      style: [styles.leadName, { color: riso[context.hue].type }],
    };
    const since = formatClock(entry.startUtc);
    const tokens: Token[] =
      elapsed < 60_000
        ? [{ text: 'Now' }, { text: 'on' }, { text: <>{context.name},</>, style: name.style }, { text: 'as' }, { text: 'of' }, { text: `${since}.` }]
        : elapsed > context.nudgeMinutes * 60_000
          ? [
              { text: 'Still' },
              { text: 'on' },
              { text: <>{context.name}?</>, style: name.style },
              { text: <Elapsed since={entry.startUtc} /> },
              { text: 'and' },
              { text: 'counting,' },
              { text: 'since' },
              { text: `${since}.` },
            ]
          : [
              { text: 'You’ve' },
              { text: 'been' },
              { text: 'on' },
              name,
              { text: 'for' },
              { text: <><Elapsed since={entry.startUtc} />,</> },
              { text: 'since' },
              { text: `${since}.` },
            ];
    const kicker = context.ancestors.map((a) => a.name).join(' › ');
    return (
      <View style={styles.lead}>
        <View style={styles.kickerRow}>
          <Caps color={riso[context.hue].type} numberOfLines={1} style={{ flexShrink: 1 }}>
            {context.glyph ? `${context.glyph}  ` : ''}
            {kicker || 'On the clock'}
          </Caps>
          <View style={styles.live}>
            <RisoDot hue={context.hue} size={7} />
            <Stopwatch since={entry.startUtc} style={styles.liveFigure} />
          </View>
        </View>
        <Typeset key={entry.id} tokens={tokens} style={[styles.headline, headlineSize(context.name)]} />
        <View style={styles.leadFoot}>
          <StopButton />
        </View>
      </View>
    );
  }

  const last = entries[entries.length - 1];
  const lastContext = last && tree.byId.get(last.contextId);
  if (last?.endUtc && lastContext) {
    return (
      <View style={styles.lead}>
        <View style={styles.kickerRow}>
          <Caps>Off the clock</Caps>
        </View>
        <Typeset
          key={`idle-${last.id}`}
          style={[styles.headline, styles.headlineIdle]}
          tokens={[
            { text: 'Off' },
            { text: 'the' },
            ...(now - last.endUtc < 60_000
              ? [{ text: 'record,' }, { text: 'as' }, { text: 'of' }]
              : [{ text: 'record' }, { text: 'for' }, { text: <><Elapsed since={last.endUtc} />,</> }, { text: 'since' }]),
            { text: `${formatClock(last.endUtc)}.` },
          ]}
        />
        <Text style={styles.deck}>
          Last on file: {lastContext.glyph ? `${lastContext.glyph} ` : ''}
          {lastContext.name}, {formatDuration(last.endUtc - last.startUtc)}.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.lead}>
      <View style={styles.kickerRow}>
        <Caps>First edition</Caps>
      </View>
      <Typeset
        key="blank"
        style={[styles.headline, styles.headlineIdle]}
        tokens={'A blank page.'.split(' ').map((text) => ({ text }))}
      />
      <Text style={styles.deck}>Tap any word below to start the clock. Everything else can be fixed later.</Text>
    </View>
  );
}

const headlineSize = (name: string) =>
  name.length > 16 ? { fontSize: 38, lineHeight: 40 } : name.length > 10 ? { fontSize: 42, lineHeight: 44 } : null;

function StopButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Stop the clock"
      accessibilityHint="Long-press to stop it earlier"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        actions.stop();
      }}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/almanac/slip', params: { kind: 'stop' } });
      }}
      delayLongPress={350}
      style={({ pressed }) => [styles.stop, pressed && { backgroundColor: 'rgba(28,26,23,0.08)' }]}>
      <View style={styles.stopSquare} />
      <Text style={styles.stopText}>Stop the clock</Text>
    </Pressable>
  );
}

/** "← Back to Job": the most used control, so the biggest thing you can press. */
function BackLine() {
  const target = useSwitchTarget();
  const [width, setWidth] = useState(0);
  if (!target) return null;
  const { context, kind } = target;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kind === 'back' ? 'Back to' : 'Resume'} ${context.name}`}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        actions.back();
      }}
      onLongPress={() => startEarlier(context.id)}
      delayLongPress={350}
      style={({ pressed }) => [styles.back, pressed && { opacity: 0.55 }]}>
      <Text style={styles.backArrow}>{kind === 'back' ? '←' : '↻'}</Text>
      <Text style={styles.backVerb}>{kind === 'back' ? 'Back to' : 'Resume'}</Text>
      <View style={{ flexShrink: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Text style={styles.backName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {context.name}
        </Text>
        {width > 0 && (
          <View style={styles.backUnderline}>
            <InkUnderline key={context.id} width={width} seed={seedOf(context.id)} color={riso[context.hue].fill} />
          </View>
        )}
      </View>
      {context.glyph && <Text style={styles.backGlyph}>{context.glyph}</Text>}
      <View style={{ flex: 1 }} />
    </Pressable>
  );
}

/** Pinned contexts as a table of words. Slots keep their holes, so nothing moves. */
function Board() {
  const { slots } = usePinned();
  const running = useRunning();
  const today = startOfDay(useNow(60_000));
  const report = useDayReport(today);

  if (slots.length === 0) {
    return (
      <View style={styles.boardEmpty}>
        <Text style={styles.deck}>Nothing pinned yet. Pin the things you switch between most from the Index.</Text>
        <InkLink onPress={() => router.push('/almanac/contexts')} textStyle={{ fontSize: 22 }}>
          Open the Index →
        </InkLink>
      </View>
    );
  }

  const rows: (ResolvedContext | null)[][] = [];
  for (let i = 0; i < slots.length; i += 3) rows.push([...slots.slice(i, i + 3), null, null].slice(0, 3));

  return (
    <View style={styles.board}>
      <View style={styles.boardHead}>
        <Caps color={ink.full}>Pinned</Caps>
        <Caps>Today</Caps>
      </View>
      <Rule weight="regular" />
      {rows.map((row, r) => (
        <View key={r} style={[styles.boardRow, r < rows.length - 1 && styles.boardRowRule]}>
          {row.map((context, c) => (
            <View key={c} style={[styles.cell, c < 2 && styles.cellRule]}>
              {context ? (
                <Tile
                  context={context}
                  runningEntryId={running?.context.id === context.id ? running.entry.id : null}
                  total={report.totals.byId.get(context.id)?.total ?? 0}
                />
              ) : (
                r * 3 + c === slots.length && <PinAnother />
              )}
            </View>
          ))}
        </View>
      ))}
      <Rule weight="regular" />
    </View>
  );
}

/** The first free cell after the last tile invites another pinned word. */
function PinAnother() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pin another context"
      onPress={() => router.push({ pathname: '/almanac/context/new', params: { pin: '1' } })}
      style={({ pressed }) => [styles.tile, styles.pinAnother, pressed && styles.tilePressed]}>
      <Text style={styles.pinAnotherText}>+ Pin{'\n'}another</Text>
    </Pressable>
  );
}

function Tile({
  context,
  runningEntryId,
  total,
}: {
  context: ResolvedContext;
  runningEntryId: string | null;
  total: number;
}) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Start ${context.name}`}
      accessibilityHint="Long-press to start it earlier"
      accessibilityState={{ selected: runningEntryId !== null }}
      onPress={() => switchTo(context.id)}
      onLongPress={() => startEarlier(context.id)}
      delayLongPress={350}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <View
        style={styles.tileWord}
        onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <Text style={styles.tileName} numberOfLines={2}>
          {context.glyph ? <Text style={styles.tileGlyph}>{context.glyph} </Text> : null}
          {context.name}
        </Text>
        {runningEntryId && box && (
          <View style={styles.circle} pointerEvents="none">
            <InkCircle
              key={runningEntryId}
              seed={seedOf(runningEntryId)}
              width={box.width + 24}
              height={box.height + 20}
              color={riso[context.hue].type}
            />
          </View>
        )}
      </View>
      <View style={styles.tileFoot}>
        <RisoDot hue={context.hue} size={8} />
        <Text style={[styles.tileFigure, total === 0 && { color: ink.faint }]}>
          {total > 0 ? formatDuration(total) : '–'}
        </Text>
      </View>
    </Pressable>
  );
}

/** "Lately: Dog, Groceries and Stint." Every name is a switch. */
function Lately() {
  const recents = useRecents(5);
  return (
    <View style={styles.lately}>
      <Text style={styles.latelyLine}>
        <Text style={styles.latelyLabel}>Lately </Text>
        {recents.length === 0 && <Text style={{ color: ink.faint }}>nothing else. </Text>}
        {recents.map((context, i) => (
          <Text key={context.id}>
            <Text onPress={() => switchTo(context.id)} onLongPress={() => startEarlier(context.id)}>
              {context.glyph ? <Text style={styles.latelyGlyph}>{`${context.glyph} `}</Text> : null}
              <Text style={styles.latelyWord}>{context.name}</Text>
            </Text>
            {i < recents.length - 2 ? ', ' : i === recents.length - 2 ? ' and ' : '. '}
          </Text>
        ))}
      </Text>
      <InkLink onPress={() => router.push('/almanac/contexts')} textStyle={styles.fullIndex} style={styles.fullIndexWrap}>
        Full index →
      </InkLink>
    </View>
  );
}

/** Today as a thin printed strip, 00–24, with the day's total. Opens The Day. */
function TodayStrip() {
  const now = useNow(60_000);
  const report = useDayReport(startOfDay(now));
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel="Open The Day"
      onPress={() => {
        Haptics.selectionAsync();
        router.push('/almanac/day');
      }}
      style={({ pressed }) => [styles.strip, pressed && { opacity: 0.6 }]}>
      <View style={styles.stripHead}>
        <Caps color={ink.full}>Today so far</Caps>
        <Caps>
          {formatDuration(report.totals.total)} · {report.fragmentation.blocks}{' '}
          {report.fragmentation.blocks === 1 ? 'block' : 'blocks'} · The Day →
        </Caps>
      </View>
      <DayStrip report={report} now={now} height={16} ticks />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  mastRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  ear: {
    width: 62,
    fontFamily: font.sansBold,
    fontSize: 7.5,
    lineHeight: 9.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: ink.soft,
  },
  masthead: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.display,
    fontSize: 42,
    lineHeight: 50,
    color: ink.full,
    letterSpacing: -0.5,
  },
  dateline: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sections: { flexDirection: 'row', justifyContent: 'space-between' },
  section: { minHeight: 44, justifyContent: 'center' },
  sectionText: { fontFamily: font.displayItalic, fontSize: 21, color: ink.full },

  lead: { paddingTop: 22, paddingBottom: 18 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveFigure: { fontFamily: font.sans, fontSize: 12, color: ink.soft, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  headline: { fontFamily: font.display, fontSize: 46, lineHeight: 47, color: ink.full, letterSpacing: -0.6 },
  headlineIdle: { color: ink.full },
  leadName: { fontFamily: font.displayItalic },
  leadFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  deck: { marginTop: 10, fontFamily: font.textItalic, fontSize: 17, lineHeight: 23, color: ink.soft },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: ink.full,
  },
  stopSquare: { width: 10, height: 10, backgroundColor: ink.red },
  stopText: { fontFamily: font.displayItalic, fontSize: 22, color: ink.full },

  back: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ink.full,
    minHeight: 72,
  },
  backArrow: { fontFamily: font.display, fontSize: 34, color: ink.full },
  backVerb: { fontFamily: font.displayItalic, fontSize: 38, color: ink.full },
  backName: { fontFamily: font.displayItalic, fontSize: 38, color: ink.full },
  backUnderline: { position: 'absolute', left: 0, bottom: -4 },
  backGlyph: { fontSize: 24 },

  board: { marginTop: 26 },
  boardHead: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 },
  boardRow: { flexDirection: 'row' },
  boardRowRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: ink.rule },
  cell: { flex: 1, minHeight: 78 },
  cellRule: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: ink.rule },
  boardEmpty: { marginTop: 24, gap: 10 },
  tile: { flex: 1, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, justifyContent: 'space-between' },
  tilePressed: { backgroundColor: 'rgba(28,26,23,0.06)' },
  pinAnother: { justifyContent: 'center' },
  pinAnotherText: { fontFamily: font.displayItalic, fontSize: 19, lineHeight: 21, color: ink.faint },
  tileWord: { alignSelf: 'flex-start', maxWidth: '100%' },
  tileName: { fontFamily: font.display, fontSize: 23, lineHeight: 25, color: ink.full },
  tileGlyph: { fontSize: 17 },
  circle: { position: 'absolute', left: -12, top: -10 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  tileFigure: { fontFamily: font.sans, fontSize: 11.5, color: ink.soft, fontVariant: ['tabular-nums'] },

  lately: { marginTop: 18 },
  latelyLine: { fontFamily: font.displayItalic, fontSize: 23, lineHeight: 32, color: ink.full },
  latelyLabel: { fontFamily: font.sansBold, fontSize: 11, letterSpacing: 1.4, color: ink.full, textTransform: 'uppercase' },
  latelyWord: { textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: ink.faint },
  latelyGlyph: { fontSize: 18 },
  fullIndexWrap: { alignSelf: 'flex-start', marginTop: 6, minHeight: 40, justifyContent: 'center' },
  fullIndex: { fontSize: 21 },

  strip: { marginTop: 28 },
  stripHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
});
