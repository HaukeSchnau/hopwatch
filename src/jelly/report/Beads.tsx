// Fragmentation as bead strings: one bead per block, sized by its length, colored by
// its context, with the block count and median length beside it.

import { StyleSheet, Text, View } from 'react-native';

import { type DayReport, formatDuration, formatWeekday, MINUTE } from '@/core';

import { alpha, tabular, text, useTheme } from '../theme';

const beadSize = (ms: number) => Math.max(7, Math.min(26, 5 + Math.sqrt(ms / MINUTE) * 1.9));

export function BeadString({ day, width }: { day: DayReport; width: number }) {
  const t = useTheme();
  const sizes = day.segments.map((s) => beadSize(s.end - s.start));
  const natural = sizes.reduce((sum, s) => sum + s + 2, 0);
  const scale = natural > width ? width / natural : 1;
  return (
    <View style={[styles.string, { width }]}>
      <View style={[styles.thread, { backgroundColor: alpha(t.c.ink, 0.12) }]} />
      {day.segments.map((s, i) => {
        const size = sizes[i] * scale;
        const c = t.candy[s.context.hue];
        return (
          <View
            key={s.entry.id}
            style={[
              styles.bead,
              { width: size, height: size, borderRadius: size / 2, backgroundColor: c.fill, borderColor: c.deep, marginRight: 2 * scale },
            ]}>
            <View style={[styles.shine, { width: size * 0.34, height: size * 0.22, top: size * 0.14, left: size * 0.2 }]} />
          </View>
        );
      })}
    </View>
  );
}

/** One row per day of the week: weekday, beads, "9 · 0:42". */
export function WeekBeads({ days, width, now }: { days: DayReport[]; width: number; now: number }) {
  const t = useTheme();
  const stringWidth = width - 44 - 76;
  return (
    <View style={styles.week}>
      {days.map((d) => {
        const future = d.start > now;
        return (
          <View key={d.start} style={[styles.row, future && { opacity: 0.35 }]}>
            <Text style={[text.subhead, styles.weekday, { color: t.c.ink }]}>{formatWeekday(d.start)}</Text>
            {d.segments.length ? (
              <BeadString day={d} width={stringWidth} />
            ) : (
              <View style={[styles.emptyString, { width: stringWidth, backgroundColor: alpha(t.c.ink, 0.07) }]} />
            )}
            <Text style={[text.subhead, tabular, styles.stat, { color: t.c.ink }]}>
              {d.fragmentation.blocks ? (
                <>
                  {d.fragmentation.blocks}
                  <Text style={{ color: t.c.muted }}> · {formatDuration(d.fragmentation.median)}</Text>
                </>
              ) : (
                <Text style={{ color: t.c.muted }}>–</Text>
              )}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 28 },
  weekday: { width: 44 },
  string: { flexDirection: 'row', alignItems: 'center', minHeight: 26 },
  thread: { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  emptyString: { height: 2, borderRadius: 1 },
  bead: { borderWidth: 1, overflow: 'hidden' },
  shine: { position: 'absolute', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.55)' },
  stat: { width: 76, textAlign: 'right' },
});
