import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DayReport } from '@/core';

import { Riso } from './Riso';
import { font, ink } from './theme';

/**
 * A day from 00 to 24 as a thin printed strip: one riso fill per block, the gaps left
 * as bare paper. `now` draws the red now-line when it falls inside the day.
 */
export function DayStrip({
  report,
  now,
  height = 14,
  ticks = false,
}: {
  report: DayReport;
  now?: number;
  height?: number;
  ticks?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const span = report.end - report.start;
  const x = (ts: number) => ((ts - report.start) / span) * width;
  return (
    <View>
      <View style={[styles.track, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 &&
          report.segments.map((s) => (
            <Riso
              key={s.entry.id}
              hue={s.context.hue}
              outline={false}
              offset={{ x: 0.8, y: 0.6 }}
              style={[styles.block, { left: x(s.start), width: Math.max(1.5, x(s.end) - x(s.start)) }]}
            />
          ))}
        {width > 0 && now !== undefined && now >= report.start && now < report.end && (
          <View style={[styles.now, { left: x(now) }]} />
        )}
      </View>
      {ticks && (
        <View style={styles.ticks}>
          {['00', '06', '12', '18', '24'].map((t) => (
            <Text key={t} style={styles.tick}>
              {t}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: ink.full,
  },
  block: { position: 'absolute', top: 0, bottom: 0 },
  now: { position: 'absolute', top: -4, bottom: -4, width: 1.5, backgroundColor: ink.red },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tick: { fontFamily: font.sans, fontSize: 9.5, color: ink.faint, fontVariant: ['tabular-nums'] },
});
