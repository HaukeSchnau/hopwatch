import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type DayReport, formatClock, formatDuration, type GapSegment, MINUTE, type Segment } from '@/core';

import { alpha, font, neon, sky } from '../theme';
import { LiveDuration, Moon, Squish } from '../ui';

type Row = { kind: 'entry'; segment: Segment } | { kind: 'gap'; gap: GapSegment };

const MIN_GAP = 5 * MINUTE;

/**
 * The day as a precise list: every block with its times, and the untracked stretches
 * between them as quiet rows that open "What was this?".
 */
export function EntryList({ report, now }: { report: DayReport; now: number }) {
  const { segments, gaps } = report;
  if (segments.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Nothing tracked</Text>
        <Text style={styles.emptyBody}>Tap a dark stretch of the ring to add what you did.</Text>
      </View>
    );
  }

  // Gaps before the first block (the night) stay on the ring only.
  const first = segments[0].start;
  const rows: Row[] = [
    ...segments.map((segment): Row => ({ kind: 'entry', segment })),
    ...gaps.filter((g) => g.start >= first && g.end - g.start >= MIN_GAP).map((gap): Row => ({ kind: 'gap', gap })),
  ].sort((a, b) => start(a) - start(b));

  return (
    <View style={styles.list}>
      {rows.map((row) =>
        row.kind === 'entry' ? <EntryRow key={row.segment.entry.id} segment={row.segment} now={now} /> : <GapRow key={`gap${row.gap.start}`} gap={row.gap} />,
      )}
    </View>
  );
}

const start = (row: Row) => (row.kind === 'entry' ? row.segment.start : row.gap.start);

function EntryRow({ segment, now }: { segment: Segment; now: number }) {
  const { context, entry, running } = segment;
  const color = neon[context.hue];
  const path = context.ancestors.map((a) => a.name).join(' › ');
  const sub = [path, entry.note].filter(Boolean).join(' · ');
  return (
    <Squish
      onPress={() => router.push({ pathname: '/orbit/entry/[id]', params: { id: entry.id } })}
      scaleTo={0.98}
      accessibilityRole="button"
      style={styles.row}>
      <View style={styles.times}>
        <Text style={styles.time}>
          {segment.clippedStart ? '‹ ' : ''}
          {formatClock(segment.start)}
        </Text>
        <Text style={styles.timeEnd}>
          {running ? 'now' : formatClock(segment.end)}
          {segment.clippedEnd && !running ? ' ›' : ''}
        </Text>
      </View>
      <View style={[styles.bar, { backgroundColor: color, shadowColor: color }]} />
      <Moon context={context} size={34} filled={running} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {context.name}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {running ? (
        <LiveDuration since={entry.startUtc} size={15} seconds={false} color={color} />
      ) : (
        <Text style={styles.duration}>{formatDuration(Math.min(segment.end, now) - segment.start)}</Text>
      )}
    </Squish>
  );
}

function GapRow({ gap }: { gap: GapSegment }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/orbit/fill', params: { start: String(gap.start), end: String(gap.end), at: String(gap.start) } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${formatDuration(gap.end - gap.start)} untracked. Fill it.`}
      style={({ pressed }) => [styles.gap, pressed && { opacity: 0.6 }]}>
      <View style={styles.times} />
      <View style={styles.gapLine} />
      <Text style={styles.gapText}>{formatDuration(gap.end - gap.start)} untracked</Text>
      <View style={styles.fill}>
        <SymbolView name="plus" size={11} tintColor={sky.accent} weight="bold" />
        <Text style={styles.fillText}>Fill</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingRight: 8 },
  times: { width: 52, alignItems: 'flex-end' },
  time: { fontFamily: font.mono, fontSize: 13, color: sky.text, fontVariant: ['tabular-nums'] },
  timeEnd: { fontFamily: font.mono, fontSize: 11, color: sky.faint, marginTop: 2, fontVariant: ['tabular-nums'] },
  bar: {
    alignSelf: 'stretch',
    width: 3,
    marginVertical: 5,
    borderRadius: 1.5,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  body: { flex: 1 },
  name: { fontFamily: font.textMedium, fontSize: 15.5, color: sky.text, letterSpacing: -0.2 },
  sub: { marginTop: 2, fontFamily: font.text, fontSize: 12, color: sky.dim },
  duration: { fontFamily: font.mono, fontSize: 14, color: sky.text, fontVariant: ['tabular-nums'] },
  gap: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 40, paddingRight: 8 },
  gapLine: {
    alignSelf: 'stretch',
    width: 3,
    marginVertical: 3,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: sky.faint,
    marginLeft: 1,
  },
  gapText: { flex: 1, fontFamily: font.mono, fontSize: 11.5, color: sky.faint, letterSpacing: 0.4, marginLeft: 46 },
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: alpha(sky.accent, 0.08),
  },
  fillText: { fontFamily: font.textBold, fontSize: 12.5, color: sky.accent },
  empty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 40, gap: 6 },
  emptyTitle: { fontFamily: font.textBold, fontSize: 16, color: sky.text },
  emptyBody: { fontFamily: font.text, fontSize: 14, lineHeight: 20, color: sky.dim, textAlign: 'center' },
});
