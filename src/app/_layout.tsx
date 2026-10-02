import { DarkTheme, DefaultTheme, type Href, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { startNudges } from '@/core/nudges';
import { initStore } from '@/core/store';
import { useDressUp } from '@/jelly/character/suggest';
import { sheet } from '@/jelly/nav';
import { useTheme } from '@/jelly/theme';
import { devLaunchRoute } from '@/shell/dev-route';
import { useFontsReady } from '@/shell/fonts';
import { useHideSplash } from '@/shell/splash';
import { startUpdates } from '@/shell/updates';
import { startLiveActivity } from '@/widgets/live-activity';

// The last resort if the frame itself fails; each route also exports its own.
export { ErrorScreen as ErrorBoundary } from '@/jelly/ErrorScreen';

SplashScreen.preventAutoHideAsync();
initStore();

// Unsigned simulator builds have no keychain entitlement, so expo-notifications can't read
// its push registration at startup. Hopwatch only uses local notifications.
LogBox.ignoreLogs(['[expo-notifications] Error reading persisted server registration info']);

/**
 * Hopwatch: native tabs at the root, with every detail presented as a form sheet over them.
 * iOS uses system fonts only, so the splash can go right away. Android keeps it up, and
 * the screens empty, until Nunito has loaded: text laid out before that would stay in
 * Roboto. Navigation colors follow the appearance: cream by day, night candy after dark.
 */
export default function RootLayout() {
  const t = useTheme();
  const fontsReady = useFontsReady();
  useHideSplash(fontsReady);
  useEffect(() => startNudges(), []);
  useEffect(() => startLiveActivity(), []);
  useEffect(() => startUpdates(), []);
  useDressUp();
  useDevLaunchRoute();
  const nav = t.dark ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={{
          ...nav,
          colors: { ...nav.colors, background: t.c.bg, card: t.c.bg, text: t.c.ink, primary: t.c.pinkDeep, border: t.c.line },
        }}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg } }}
          // Empties the screens rather than the navigator, so routes and links work meanwhile.
          screenLayout={fontsReady ? undefined : blank}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="start" options={sheet([0.78], t.c.bg)} />
          <Stack.Screen name="stop" options={sheet([0.84], t.c.bg)} />
          <Stack.Screen name="pick" options={sheet([0.62, 1], t.c.bg)} />
          <Stack.Screen name="context" options={sheet([1], t.c.bg)} />
          <Stack.Screen name="entry" options={sheet([1], t.c.bg)} />
          <Stack.Screen name="settings" options={sheet([1], t.c.bg)} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const blank = () => <></>;

/** Development only: opens the route passed as `-hopwatchRoute` (see scripts/sim.sh). */
function useDevLaunchRoute() {
  useEffect(() => {
    const route = devLaunchRoute();
    // Launch arguments are arbitrary strings from simctl, so they can't be typed routes.
    if (route) router.replace(route as Href);
  }, []);
}
