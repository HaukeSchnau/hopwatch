// Backdated stop: "stopped N minutes ago" chips, a specific time, or now. Opened by
// long-pressing Stop and by tapping a forgotten-timer nudge.

import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { actions, formatClock, formatDuration, MINUTE, useNow, useRunning } from '@/core';
import { sheetsText } from '@/i18n/sheets';

import { play } from '../feedback';
import { stopConsequence } from '../menus';
import { useTheme } from '../theme';
import { JellyButton } from '../ui';
import { AGO, AgoChips, pastAt, sheetBody, SheetHeader, useSheetStyles } from './parts';
import { TimeWheel } from './time';

export function StopSheet() {
  const running = useRunning();
  const now = useNow(15_000);
  const t = useTheme();
  const ss = useSheetStyles();
  // Ten minutes ago on the 5-minute grid, but never before the entry started.
  const [picked, setPicked] = useState(() => {
    const step = 5 * MINUTE;
    const guess = Math.floor((Date.now() - 10 * MINUTE) / step) * step;
    const start = running ? Math.ceil(running.entry.startUtc / step) * step : guess;
    return new Date(Math.min(Date.now(), Math.max(guess, start)));
  });

  if (!running) {
    return (
      <ScrollView contentContainerStyle={sheetBody}>
        <SheetHeader context={null} title={sheetsText.nothingRunning} subtitle={sheetsText.stop.allAsleep} />
        <JellyButton label={sheetsText.close} palette={t.inkCandy} onPress={() => router.back()} style={{ marginTop: 24 }} />
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
    <ScrollView contentContainerStyle={sheetBody}>
      <SheetHeader
        context={context}
        mood="asleep"
        title={overdue ? sheetsText.stop.stillOn(context.name) : sheetsText.stopName(context.name)}
        subtitle={sheetsText.stop.since(formatClock(entry.startUtc), formatDuration(elapsed))}
      />
      <Text style={ss.label}>{sheetsText.stop.stopped}</Text>
      <AgoChips hue={context.hue} now={now} options={AGO} earliest={entry.startUtc} onPick={stop} />
      <Text style={ss.label}>{sheetsText.orAt}</Text>
      <TimeWheel value={picked} onChange={setPicked} hue={context.hue} />
      <Text style={ss.hint}>{tooEarly ? sheetsText.stop.beforeStart(formatClock(entry.startUtc)) : stopConsequence(context.name, entry.startUtc, at)}</Text>
      <JellyButton
        label={sheetsText.stopAt(formatClock(at))}
        hue={context.hue}
        size="large"
        disabled={tooEarly}
        onPress={() => stop(at)}
        style={{ marginTop: 12 }}
      />
      <JellyButton label={sheetsText.stopNow} icon={{ ios: 'stop.fill', android: 'stop' }} palette={t.inkCandy} onPress={() => stop()} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}
