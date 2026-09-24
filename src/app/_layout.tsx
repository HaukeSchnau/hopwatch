import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startNudges } from '@/core/nudges';
import { initStore } from '@/core/store';

// Directions hide the splash once their fonts are loaded (see useHideSplash).
SplashScreen.preventAutoHideAsync();
initStore();

// Unsigned simulator builds have no keychain entitlement, so expo-notifications can't read
// its push registration at startup. Stint only uses local notifications.
LogBox.ignoreLogs(['[expo-notifications] Error reading persisted server registration info']);

export default function RootLayout() {
  useEffect(() => startNudges(), []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </GestureHandlerRootView>
  );
}
