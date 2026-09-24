import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { actions, useIntent, useRunning, useStint } from '@/core';

import { MiniPlayer } from './MiniPlayer';
import { Onboarding } from './Onboarding';
import { useTheme } from './theme';
import { UndoToast } from './UndoToast';

/**
 * The Liquid Glass tab bar: Now, Day, Report, Contexts. The selected tab takes on the
 * running context's color, and away from Now the running timer rides above the bar as
 * a mini player. With no contexts yet, onboarding replaces the tabs.
 */
export function GlassTabs() {
  const theme = useTheme();
  const running = useRunning();
  const empty = useStint((s) => s.contexts.length === 0);
  const [tab, setTab] = useState('index');
  useStopIntent();

  if (empty) return <Onboarding />;
  const accessory = running !== null && tab !== 'index';

  return (
    <View style={styles.screen}>
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={running ? theme.hue(running.context.hue).ink : theme.label}
        screenListeners={({ route }) => ({ focus: () => setTab(route.name) })}>
        {accessory ? (
          <NativeTabs.BottomAccessory>
            <MiniPlayer running={running} />
          </NativeTabs.BottomAccessory>
        ) : null}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Now</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="timer" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="day">
          <NativeTabs.Trigger.Label>Day</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar.day.timeline.left" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="report">
          <NativeTabs.Trigger.Label>Report</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="contexts">
          <NativeTabs.Trigger.Label>Contexts</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>
      <UndoToast lift={accessory ? 56 : 0} />
    </View>
  );
}

/** A tapped nudge asks for the stop sheet: open Now and the backdated stop. */
function useStopIntent() {
  const intent = useIntent();
  useEffect(() => {
    if (intent?.kind !== 'stop-sheet') return;
    actions.consumeIntent();
    if (!useStint.getState().entries.some((e) => e.endUtc === null)) return;
    router.navigate('/glass');
    router.push({ pathname: '/glass/backdate', params: { mode: 'stop', nudge: '1' } });
  }, [intent]);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
