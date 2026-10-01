// Backdated start: "started N minutes ago" chips or a specific time. Opened by
// long-pressing a tile, bean or the back pill, and by tapping "since 09:12".

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

import { actions, formatClock, MINUTE, useEntries, useNow, useRunning, useTree } from '@/core';

import { play } from '../feedback';
import { startConsequence } from '../menus';
import { noteSource } from '../now/choreo';
import { JellyButton } from '../ui';
import { AGO, AgoChips, pastAt, sheetBody, SheetHeader, TimeWheel, useSheetStyles } from './parts';

const roundDown = (t: number, step: number) => Math.floor(t / step) * step;

export function StartSheet() {
  const { context: id } = useLocalSearchParams<{ context?: string }>();
  const tree = useTree();
  const context = tree.ordered.find((c) => c.id === id) ?? null;
  const running = useRunning();
  const entries = useEntries();
  const now = useNow(15_000);
  const ss = useSheetStyles();
  const [picked, setPicked] = useState(() => new Date(roundDown(Date.now() - 15 * MINUTE, 5 * MINUTE)));

  if (!context) {
    return (
 <ScrollView contentContainerStyle={sheetBody}>
        <SheetHeader context={null} title="That jelly is gone" subtitle="It may have been deleted." />
      </ScrollView>
    );
  }

  const isRunning = running?.context.id === context.id;
  const at = pastAt(picked, now);
  const start = (t: number) => {
    if (isRunning && running) {
      // Correcting the running entry's start, earlier or later.
      actions.updateEntry(running.entry.id, { startUtc: t }, `${context.name} since ${formatClock(t)}`);
    } else {
      noteSource(context.id, 'start-sheet');
      actions.start(context.id, { at: t });
      play('pop');
    }
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={sheetBody}>
      <SheetHeader
        context={context}
        title={isRunning ? `${context.name} started earlier` : `Start ${context.name} earlier`}
        subtitle={isRunning && running ? `Running since ${formatClock(running.entry.startUtc)}` : 'When did it really start?'}
      />
      <Text style={ss.label}>Started</Text>
      <AgoChips hue={context.hue} now={now} options={AGO} onPick={start} />
      <Text style={ss.label}>Or at</Text>
      <TimeWheel value={picked} onChange={setPicked} hue={context.hue} />
      <Text style={ss.hint}>{startConsequence(entries, tree, context.id, at, now)?.text ?? ' '}</Text>
      <JellyButton
        label={isRunning ? `Move start to ${formatClock(at)}` : `Start at ${formatClock(at)}`}
        hue={context.hue}
        size="large"
        onPress={() => start(at)}
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
}
