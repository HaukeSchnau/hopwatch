// Now: the switcher, where the app opens. The candy dial with the running jelly on
// top, "Back to X" under it, the pinned grid and the recents row below, within thumb
// reach. No header: the dial's corners carry the date and today's total.

import { LinearGradient } from 'expo-linear-gradient';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRunning } from '@/core';

import { ScreenTab } from '../showing';
import { alpha, useTheme } from '../theme';
import { Toast } from '../Toast';
import { BackPill } from './BackPill';
import { FlyerLayer } from './Flyer';
import { Grid } from './Grid';
import { Recents } from './Recents';
import { Stage } from './Stage';

export function NowScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const running = useRunning();
  return (
    <ScreenTab value="index">
      <View style={[styles.screen, { backgroundColor: t.c.bg }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          // Android doesn't inset scroll views by itself; the tab bar takes care of the bottom.
          contentContainerStyle={[styles.content, Platform.OS === 'android' && { paddingTop: insets.top + 6 }]}
          showsVerticalScrollIndicator={false}>
          <Stage running={running} />
          <View style={styles.gap} />
          <BackPill />
          <View style={styles.gap} />
          <Grid runningId={running?.context.id ?? null} />
          <Recents />
        </ScrollView>
        {/* The page melts away under the status bar instead of being sliced off. */}
        <LinearGradient
          pointerEvents="none"
          colors={[t.c.bg, alpha(t.c.bg, 0.85), alpha(t.c.bg, 0)]}
          locations={[0, 0.55, 1]}
          style={[styles.fade, { height: insets.top + 14 }]}
        />
        <FlyerLayer />
        <Toast />
      </View>
    </ScreenTab>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // On iOS, the scroll view insets itself for the status bar and the tab bar.
  content: { paddingTop: 6, paddingBottom: 24 },
  gap: { height: 14 },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
});
