import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useDressUp } from '@/directions/jelly/character/suggest';
import { useDevScript } from '@/directions/jelly/devScript';
import { sheet } from '@/directions/jelly/nav';
import { useTheme } from '@/directions/jelly/theme';
import { useHideSplash } from '@/shell/splash';

/**
 * Jelly: native tabs at the root, with every detail presented as a form sheet over them.
 * System fonts only, so the splash can go right away. Navigation colors follow the
 * appearance: cream by day, night candy after dark.
 */
export default function JellyLayout() {
  const t = useTheme();
  useHideSplash();
  useDevScript();
  useDressUp();
  const nav = t.dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...nav,
        colors: { ...nav.colors, background: t.c.bg, card: t.c.bg, text: t.c.ink, primary: t.c.pinkDeep, border: t.c.line },
      }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="start" options={sheet([0.78], t.c.bg)} />
        <Stack.Screen name="stop" options={sheet([0.84], t.c.bg)} />
        <Stack.Screen name="pick" options={sheet([0.62, 1], t.c.bg)} />
        <Stack.Screen name="context" options={sheet([1], t.c.bg)} />
        <Stack.Screen name="entry" options={sheet([1], t.c.bg)} />
        <Stack.Screen name="settings" options={sheet([1], t.c.bg)} />
      </Stack>
    </ThemeProvider>
  );
}
