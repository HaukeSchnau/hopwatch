import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { actions, formatClock, formatDuration, HOUR, MINUTE } from '@/core';

import { ContextPicker } from '../ContextPicker';
import { snap } from '../geometry';
import { SheetHeader } from '../sheet';
import { font, sky } from '../theme';
import { TimeField } from '../TimeField';
import { Label } from '../ui';

/** The part of a gap to fill first: all of it, or an hour around the tap when it is long. */
function initialRange(start: number, end: number, at: number) {
  if (end - start <= 3 * HOUR) return { from: start, to: end };
  const to = Math.min(end, Math.max(start + HOUR, snap(at) + 30 * MINUTE));
  return { from: Math.max(start, to - HOUR), to };
}

/**
 * "What was this?": fills an untracked stretch. The range can be narrowed; the domain
 * clamps the new entry to the gap.
 */
export function FillSheet() {
  const params = useLocalSearchParams<{ start?: string; end?: string; at?: string }>();
  const gapStart = Number(params.start);
  const gapEnd = Number(params.end);
  const valid = Number.isFinite(gapStart) && Number.isFinite(gapEnd) && gapEnd > gapStart;
  const initial = initialRange(gapStart, gapEnd, Number(params.at ?? params.start));
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const whole = from === gapStart && to === gapEnd;

  if (!valid) return <SheetHeader title="Nothing to fill" />;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 40 }}>
      <SheetHeader kicker="What was this?" title={`${formatClock(from)} – ${formatClock(to)}`} />
      <View style={styles.range}>
        <TimeField
          value={from}
          color={sky.accent}
          min={gapStart}
          max={to - MINUTE}
          onChange={(t) => setFrom(Math.max(gapStart, Math.min(t, to - MINUTE)))}
        />
        <Text style={styles.dash}>→</Text>
        <TimeField
          value={to}
          color={sky.accent}
          min={from + MINUTE}
          max={gapEnd}
          onChange={(t) => setTo(Math.min(gapEnd, Math.max(t, from + MINUTE)))}
        />
        <Text style={styles.duration}>{formatDuration(to - from)}</Text>
      </View>
      {!whole && (
        <Pressable
          onPress={() => {
            setFrom(gapStart);
            setTo(gapEnd);
          }}
          style={styles.whole}>
          <Text style={styles.wholeText}>
            Whole gap, {formatClock(gapStart)} – {formatClock(gapEnd)}
          </Text>
        </Pressable>
      )}
      <Label style={styles.label}>Pick a context</Label>
      <ContextPicker
        onPick={(context) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          actions.fillGap(context.id, from, to);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  range: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginTop: 6 },
  dash: { fontFamily: font.mono, fontSize: 14, color: sky.faint },
  duration: { marginLeft: 6, fontFamily: font.mono, fontSize: 15, color: sky.text },
  whole: { alignSelf: 'center', padding: 10 },
  wholeText: { fontFamily: font.textBold, fontSize: 13, color: sky.accent },
  label: { marginTop: 18, marginBottom: 6, marginLeft: 24 },
});
