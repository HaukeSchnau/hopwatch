// Backdated stop: "stopped N minutes ago" chips, a specific time, or now. Opened by
// long-pressing Stop and by tapping a forgotten-timer nudge.

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { actions, formatClock, formatDuration, MINUTE, useNow, useRunning } from '@/core';

import { play } from '../feedback';
import { inkCandy, JellyButton } from '../ui';
import { AGO, AgoChips, pastAt, SheetHeader, sheetStyles, TimeWheel } from './parts';

export function StopSheet() {
  const running = useRunning();
  const now = useNow(15_000);
  // Ten minutes ago on the 5-minute grid, but never before the entry started.
  const [picked, setPicked] = useState(() => {
    const step = 5 * MINUTE;
    const guess = Math.floor((Date.now() - 10 * MINUTE) / step) * step;
    const start = running ? Math.ceil(running.entry.startUtc / step) * step : guess;
    return new Date(Math.min(Date.now(), Math.max(guess, start)));
  });

  if (!running) {
    return (
      <ScrollView contentContainerStyle={sheetStyles.body}>
        <SheetHeader context={null} title="Nothing is running" subtitle="All the jellies are asleep." />
        <JellyButton label="Close" palette={inkCandy} onPress={() => router.back()} style={{ marginTop: 24 }} />
      </ScrollView>
    );
  }

  const { context, entry } = running;
  const elapsed = now - entry.startUtc;
  const overdue = elapsed >= context.nudgeMinutes * MINUTE;
  const at = pastAt(picked, now);
  const tooEarly = at < entry.startUtc;
  const stop = (t?: number) => {
    actions.stop(t === undefined ? {} : { at: t });
    play('boop');
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={sheetStyles.body}>
      <SheetHeader
        context={context}
        mood="asleep"
        title={overdue ? `Still on ${context.name}?` : `Stop ${context.name}`}
        subtitle={`Since ${formatClock(entry.startUtc)} · ${formatDuration(elapsed)} so far`}
      />
      <Text style={sheetStyles.label}>Stopped</Text>
      <AgoChips hue={context.hue} now={now} options={AGO} earliest={entry.startUtc} onPick={stop} />
      <Text style={sheetStyles.label}>Or at</Text>
      <TimeWheel value={picked} onChange={setPicked} hue={context.hue} />
      <Text style={sheetStyles.hint}>{tooEarly ? `That's before it started at ${formatClock(entry.startUtc)}` : ' '}</Text>
      <JellyButton
        label={`Stop at ${formatClock(at)}`}
        hue={context.hue}
        size="large"
        disabled={tooEarly}
        onPress={() => stop(at)}
        style={{ marginTop: 12 }}
      />
      <JellyButton label="Stop now" icon="stop.fill" palette={inkCandy} onPress={() => stop()} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}
