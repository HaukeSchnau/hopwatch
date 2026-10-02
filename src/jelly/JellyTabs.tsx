// The native Liquid Glass tab bar: Now, Day, Week and Stuff, with SF Symbols tinted in
// the running jelly's candy color. Away from Now, the running jelly rides above the bar
// as a mini player. With no jellies yet, onboarding replaces the tabs. Each tab hosts its
// own toast, since a tab's native stack covers anything layered over the tab bar.

import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { actions, useIntent, useRunning, useStint, useTree } from '@/core';
import { shellText } from '@/i18n/shell';

import { MiniPlayer } from './MiniPlayer';
import { useTheme } from './theme';
import { Welcome } from './welcome/Welcome';

export function JellyTabs() {
  const t = useTheme();
  const running = useRunning();
  const empty = useTree().ordered.length === 0;
  const [tab, setTab] = useState('index');
  useStopSheetIntent();

  if (empty) return <Welcome />;
  const accessory = running !== null && tab !== 'index';

  return (
    <View style={[styles.screen, { backgroundColor: t.c.bg }]}>
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={running ? t.candy[running.context.hue].ink : t.c.pinkDeep}
        screenListeners={({ route }) => ({ focus: () => setTab(route.name) })}>
        {accessory ? (
          <NativeTabs.BottomAccessory>
            <MiniPlayer running={running} />
          </NativeTabs.BottomAccessory>
        ) : null}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{shellText.tabs.now}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'face.smiling', selected: 'face.smiling.inverse' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="day">
          <NativeTabs.Trigger.Label>{shellText.tabs.day}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar.day.timeline.left" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="week">
          <NativeTabs.Trigger.Label>{shellText.tabs.week}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'circle.hexagongrid', selected: 'circle.hexagongrid.fill' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="stuff">
          <NativeTabs.Trigger.Label>{shellText.tabs.stuff}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}

/** A tapped nudge asks for the backdated-stop sheet. */
function useStopSheetIntent() {
  const intent = useIntent();
  useEffect(() => {
    if (intent?.kind !== 'stop-sheet') return;
    actions.consumeIntent();
    if (!useStint.getState().entries.some((e) => e.endUtc === null)) return;
    router.navigate('/');
    router.push('/stop');
  }, [intent]);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
