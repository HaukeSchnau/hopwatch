import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { actions, type ContextId, formatClock, formatDuration, HOUR, MINUTE, startOfDay, usePickableContexts, usePinned } from '@/core';

import { CapLegend, legendOf } from '../CapLegend';
import { ContextList } from '../ContextList';
import { success } from '../feedback';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Section } from '../Section';
import { Sheet } from '../sheet';
import { TimeJog } from '../TimeJog';
import { capColor, lcd } from '../theme';

/**
 * The first guess for a gap: all of it when it's short, otherwise the hour around the
 * tapped moment, so a tap in a long night doesn't fill eight hours.
 */
function propose(start: number, end: number, at: number) {
  if (end - start <= 3 * HOUR) return { from: start, to: end };
  const quarter = 15 * MINUTE;
  const from = Math.max(start, Math.min(end - HOUR, Math.floor((at - 30 * MINUTE) / quarter) * quarter));
  return { from, to: Math.min(end, from + HOUR) };
}

/** "What was this?": pick a context for an untracked stretch, clamped to the gap. */
export function FillSheet() {
  const params = useLocalSearchParams<{ start: string; end: string; at?: string }>();
  const gapStart = Number(params.start);
  const gapEnd = Number(params.end);
  const initial = propose(gapStart, gapEnd, Number(params.at ?? params.start));
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const contexts = usePickableContexts();
  const { tiles } = usePinned();

  const fill = (contextId: ContextId) => {
    actions.fillGap(contextId, from, to);
    success();
    router.back();
  };

  return (
    <Sheet title="WHAT WAS THIS?" subtitle={`UNTRACKED ${formatClock(gapStart)}–${formatClock(gapEnd)}`}>
      <Lcd style={styles.summary} contentStyle={styles.summaryContent}>
        <LcdText size={8.5} color={lcd.dim}>
          FILL
        </LcdText>
        <LcdText dot size={32} color={lcd.hot} style={styles.range}>
          {formatClock(from)}–{formatClock(to)}
        </LcdText>
        <LcdText size={10}>{formatDuration(to - from)}</LcdText>
      </Lcd>
      <Section label="FROM" />
      <TimeJog value={from} min={gapStart} max={to - 5 * MINUTE} day={startOfDay(gapStart)} onChange={setFrom} />
      <Section label="TO" />
      <TimeJog value={to} min={from + 5 * MINUTE} max={gapEnd} day={startOfDay(gapStart)} onChange={setTo} />
      {tiles.length > 0 ? (
        <>
          <Section label="PRESS A KEY" />
          <View style={styles.keys}>
            {tiles.map((c) => (
              <View key={c.id} style={styles.keyCell}>
                <Key color={capColor[c.hue]} height={58} onPress={() => fill(c.id)} capStyle={styles.cap}>
                  <CapLegend {...legendOf(c)} />
                </Key>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Section label="OR ANY CONTEXT" />
      <Lcd style={styles.list}>
        <ScrollView nestedScrollEnabled contentContainerStyle={styles.listContent} indicatorStyle="white">
          <ContextList contexts={contexts} onPick={(c) => fill(c.id)} />
        </ScrollView>
      </Lcd>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  summary: { height: 108 },
  summaryContent: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  range: { lineHeight: 38 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  keyCell: { width: '31.2%' },
  cap: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 7 },
  list: { height: 300 },
  listContent: { paddingVertical: 6 },
});
