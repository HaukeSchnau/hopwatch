import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  actions,
  addDays,
  type ContextId,
  formatClock,
  formatDuration,
  formatRelativeDay,
  MINUTE,
  type ResolvedContext,
  useContextById,
  useEntries,
  useRunning,
} from '@/core';

import { Glass } from '../Glass';
import { SheetHeader } from '../SheetHeader';
import { useTheme } from '../theme';

const QUICK = [5, 10, 15, 30, 45, 60];

/**
 * Backdating with precision: quick "N min ago" chips that commit right away (two taps
 * from a nudge), or a time wheel with a note on what the change will trim.
 * `mode=start&context=…` starts earlier; `mode=stop` stops the running entry earlier.
 */
export function BackdateSheet() {
  const params = useLocalSearchParams<{ mode?: string; context?: string; nudge?: string }>();
  const running = useRunning();
  const target = useContextById(params.context as ContextId | undefined);
  if (params.mode === 'start' && target) return <Backdate mode="start" context={target} since={null} nudge={false} />;
  if (params.mode === 'stop' && running) {
    return <Backdate mode="stop" context={running.context} since={running.entry.startUtc} nudge={params.nudge === '1'} />;
  }
  return <Nothing />;
}

function Backdate({
  mode,
  context,
  since,
  nudge,
}: {
  mode: 'start' | 'stop';
  context: ResolvedContext;
  /** Start of the running entry, for stops. */
  since: number | null;
  nudge: boolean;
}) {
  const theme = useTheme();
  const hue = theme.hue(context.hue);
  const [openedAt] = useState(Date.now);
  const [at, setAt] = useState(() => (since !== null && openedAt - since < 15 * MINUTE ? openedAt : openedAt - 15 * MINUTE));
  const earliest = since ?? addDays(openedAt, -7);
  // Stopping also offers "Now", so a nudge is two taps: the notification, then a chip.
  const quick = [...(mode === 'stop' ? [0] : []), ...QUICK.filter((m) => openedAt - m * MINUTE > earliest)];

  const commit = (time: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === 'start') actions.start(context.id, { at: time });
    else actions.stop({ at: time });
    router.back();
  };

  const title = nudge ? `Still on ${context.name}?` : `${mode === 'start' ? 'Start' : 'Stop'} ${context.name} Earlier`;
  const subtitle =
    since !== null ? `Running for ${formatDuration(openedAt - since)} since ${formatClock(since)}` : 'Pick when it really started';

  return (
    <View style={styles.screen}>
      <SheetHeader title={title} subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content}>
        {quick.length ? <Text style={[styles.label, { color: theme.secondary }]}>{mode === 'start' ? 'Started' : 'Stopped'}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller} contentContainerStyle={styles.chips}>
          {quick.map((m) => (
            <Pressable key={m} accessibilityRole="button" onPress={() => commit(Date.now() - m * MINUTE)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
              <View style={[styles.chip, { backgroundColor: theme.card }]}>
                <Text style={[styles.chipText, { color: theme.label }]}>{m === 0 ? 'Now' : `${m} min ago`}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: theme.secondary }]}>Or at a time</Text>
        <View style={[styles.wheel, { backgroundColor: theme.card }]}>
          <Host style={styles.host}>
            <DatePicker
              selection={new Date(at)}
              range={{ start: new Date(earliest), end: new Date(openedAt) }}
              displayedComponents={['date', 'hourAndMinute']}
              onDateChange={(date) => setAt(date.getTime())}
              modifiers={[datePickerStyle('wheel'), labelsHidden()]}
            />
          </Host>
        </View>
        <Consequence mode={mode} context={context} at={at} since={since} />

        <Pressable accessibilityRole="button" onPress={() => commit(at)} style={({ pressed }) => [styles.cta, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <Glass interactive tint={hue.solid} style={styles.ctaGlass}>
            <Text style={[styles.ctaText, { color: hue.onSolid }]}>
              {mode === 'start' ? 'Start' : 'Stop'} at {formatClock(at)}
              {formatRelativeDay(at, openedAt) === 'Today' ? '' : `, ${formatRelativeDay(at, openedAt)}`}
            </Text>
          </Glass>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** One line on what the backdate does to the timeline, so nothing vanishes unnoticed. */
function Consequence({ mode, context, at, since }: { mode: 'start' | 'stop'; context: ResolvedContext; at: number; since: number | null }) {
  const theme = useTheme();
  const entries = useEntries();
  const running = useRunning();
  let text: string;
  if (mode === 'stop' && since !== null) {
    text = `${context.name} will have run ${formatDuration(Math.max(0, at - since))}.`;
  } else {
    const later = entries.filter((e) => e.startUtc >= at && e.id !== running?.entry.id);
    const cut = running && running.context.id !== context.id && running.entry.startUtc < at ? running.context.name : null;
    const parts = [
      cut ? `${cut} ends at ${formatClock(at)}` : null,
      later.length ? `${later.length} later ${later.length === 1 ? 'entry is' : 'entries are'} replaced` : null,
    ].filter(Boolean);
    text = parts.length ? `${parts.join('; ')}.` : `Nothing else changes.`;
  }
  return <Text style={[styles.consequence, { color: theme.secondary }]}>{text}</Text>;
}

function Nothing() {
  const theme = useTheme();
  return (
    <View style={styles.screen}>
      <SheetHeader title="Nothing Running" />
      <Text style={[styles.consequence, { color: theme.secondary, textAlign: 'center', marginTop: 24 }]}>
        The timer has already stopped.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 10, marginLeft: 4 },
  chipScroller: { marginHorizontal: -20, flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 20 },
  chip: { height: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center' },
  chipText: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  wheel: { borderRadius: 26, paddingVertical: 4, alignItems: 'center' },
  host: { alignSelf: 'stretch', height: 216 },
  consequence: { fontSize: 13, lineHeight: 18, marginTop: 10, marginHorizontal: 4 },
  cta: { marginTop: 18 },
  ctaGlass: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
});
