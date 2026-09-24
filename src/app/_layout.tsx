import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Settings } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startNudges } from '@/core/nudges';
import { initStore } from '@/core/store';

// Directions hide the splash once their fonts are loaded (see useHideSplash).
SplashScreen.preventAutoHideAsync();
initStore();

export default function RootLayout() {
  useEffect(() => startNudges(), []);
  useDevLaunchRoute();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </GestureHandlerRootView>
  );
}

/**
 * Development only: `simctl launch … -stintRoute /glass/day` opens that route on launch.
 * Launch arguments land in NSUserDefaults, which RN's Settings reads. Simulator deep
 * links would otherwise stop at iOS's "Open in …?" prompt.
 */
function useDevLaunchRoute() {
  useEffect(() => {
    if (!__DEV__) return;
    const route: unknown = Settings.get('stintRoute');
    if (typeof route !== 'string' || !route.startsWith('/')) return;
    const timer = setTimeout(() => router.replace(route as Parameters<typeof router.replace>[0]), 50);
    return () => clearTimeout(timer);
  }, []);
}
