import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance, View } from 'react-native';

import { orbitFonts } from '@/directions/orbit/fonts';
import { sheetOptions } from '@/directions/orbit/sheet';
import { sky } from '@/directions/orbit/theme';
import { useHideSplash } from '@/shell/splash';

export const unstable_settings = { anchor: '(tabs)' };

/** Orbit's root: fonts, a forced dark appearance, the tabs and the sheets above them. */
export default function OrbitLayout() {
  const [loaded] = useFonts(orbitFonts);
  useHideSplash(loaded);
  // Orbit is dark only; native pickers, alerts and the keyboard should agree.
  useEffect(() => {
    Appearance.setColorScheme('dark');
    return () => Appearance.setColorScheme('unspecified');
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: sky.bg }} />;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: sky.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry/[id]" options={sheetOptions([0.72, 1])} />
        <Stack.Screen name="context/[id]" options={sheetOptions([0.92])} />
        <Stack.Screen name="fill" options={sheetOptions([0.7, 1])} />
        <Stack.Screen name="pick" options={sheetOptions([0.7, 1])} />
      </Stack>
    </>
  );
}
