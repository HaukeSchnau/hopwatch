import { LinearGradient } from 'expo-linear-gradient';
import { router, useGlobalSearchParams } from 'expo-router';
import { TabList, TabSlot, Tabs, TabTrigger } from 'expo-router/ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, useIntent, useRunning, useTree } from '@/core';
import { Starfield } from '@/directions/orbit/Starfield';
import { TabBar, tabs } from '@/directions/orbit/TabBar';
import { neon, sky } from '@/directions/orbit/theme';
import { UndoToast } from '@/directions/orbit/Toast';

/**
 * Orbit's five tabs under one sky, with the floating bar and the undo toast. A tapped
 * nudge brings the Now tab forward, where the backdated stop opens. In development,
 * `?nudge=1` on any tab simulates that tap.
 */
export default function TabsLayout() {
  const empty = useTree().ordered.length === 0;
  const running = useRunning();
  const insets = useSafeAreaInsets();
  const intent = useIntent();
  const { nudge } = useGlobalSearchParams<{ nudge?: string }>();
  useEffect(() => {
    if (__DEV__ && nudge === '1') actions.setIntent({ kind: 'stop-sheet' });
  }, [nudge]);
  useEffect(() => {
    if (intent?.kind === 'stop-sheet') router.navigate('/orbit');
  }, [intent]);
  return (
    <Tabs style={styles.root}>
      <Starfield tint={running ? neon[running.context.hue] : null} />
      <TabSlot style={styles.slot} />
      {/* Content scrolling under the status bar fades into the sky. */}
      <LinearGradient colors={[sky.bg, `${sky.bg}00`]} style={[styles.fade, { height: insets.top + 14 }]} pointerEvents="none" />
      <UndoToast />
      {!empty && <TabBar />}
      <TabList style={styles.hidden}>
        {tabs.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
        ))}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1, backgroundColor: 'transparent' },
  hidden: { display: 'none' },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
});
