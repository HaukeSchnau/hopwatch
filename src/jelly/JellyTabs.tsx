// The native Liquid Glass tab bar: Now, Day, Week and Stuff, with SF Symbols tinted in
// the running jelly's candy color. Away from Now, the running jelly rides above the bar
// as a mini player. With no jellies yet, onboarding replaces the tabs. Each tab hosts its
// own toast, since a tab's native stack covers anything layered over the tab bar.
//
// Android gets a Material navigation bar in Jelly's colors with Material Symbols, and the
// mini player as a card above it inside Day, Week and Stuff (see TabStack in nav.tsx).

import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { actions, useIntent, useRunning, useHopwatch, useTree } from '@/core';
import { shellText } from '@/i18n/shell';

import { MiniPlayer } from './MiniPlayer';
import { alpha, nunito, type Theme, useTheme } from './theme';
import { Welcome } from './welcome/Welcome';

export function JellyTabs() {
  const t = useTheme();
  const running = useRunning();
  const empty = useTree().ordered.length === 0;
  const [tab, setTab] = useState('index');
  useStopSheetIntent();

  if (empty) return <Welcome />;
  const accessory = running !== null && tab !== 'index';
  const tint = running ? t.candy[running.context.hue].ink : t.c.pinkDeep;

  return (
    <View style={[styles.screen, { backgroundColor: t.c.bg }]}>
      <NativeTabs
        minimizeBehavior="onScrollDown"
        tintColor={tint}
        {...(Platform.OS === 'android' ? materialBar(t, tint, running ? t.candy[running.context.hue].tint : null) : {})}
        screenListeners={({ route }) => ({ focus: () => setTab(route.name) })}>
        {accessory ? (
          <NativeTabs.BottomAccessory>
            <MiniPlayer running={running} />
          </NativeTabs.BottomAccessory>
        ) : null}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>{shellText.tabs.now}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'face.smiling', selected: 'face.smiling.inverse' }} md="mood" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="day">
          <NativeTabs.Trigger.Label>{shellText.tabs.day}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar.day.timeline.left" md="view_timeline" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="week">
          <NativeTabs.Trigger.Label>{shellText.tabs.week}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'circle.hexagongrid', selected: 'circle.hexagongrid.fill' }} md="bubble_chart" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="stuff">
          <NativeTabs.Trigger.Label>{shellText.tabs.stuff}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'square.stack.3d.up', selected: 'square.stack.3d.up.fill' }} md="stacks" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}

/**
 * Android's navigation bar in Jelly's colors instead of the wallpaper's: muted items, the
 * selected one in `tint` on a pill in the running jelly's wash (pink when nothing runs).
 */
function materialBar(t: Theme, tint: string, wash: string | null) {
  const label = { fontFamily: nunito['700'], fontSize: 12 };
  return {
    backgroundColor: t.c.card,
    iconColor: { default: t.c.muted, selected: tint },
    labelStyle: { default: { ...label, color: t.c.muted }, selected: { ...label, color: tint } },
    indicatorColor: wash ?? t.candy.pink.tint,
    rippleColor: alpha(tint, 0.16),
    labelVisibilityMode: 'labeled',
  } as const;
}

/** A tapped nudge asks for the backdated-stop sheet. */
function useStopSheetIntent() {
  const intent = useIntent();
  useEffect(() => {
    if (intent?.kind !== 'stop-sheet') return;
    actions.consumeIntent();
    if (!useHopwatch.getState().entries.some((e) => e.endUtc === null)) return;
    router.navigate('/');
    router.push('/stop');
  }, [intent]);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
