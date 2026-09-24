import { Stack } from 'expo-router';

import { useDevScript } from '@/directions/glass/devScript';
import { sheetOptions } from '@/directions/glass/sheet';
import { useHideSplash } from '@/shell/splash';

/**
 * Glass: native tabs at the root, with every detail view presented as a sheet over
 * them. System fonts only, so the splash can go right away.
 */
export default function GlassLayout() {
  useHideSplash();
  useDevScript();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pick" options={sheetOptions([0.7, 1])} />
      <Stack.Screen name="fill" options={sheetOptions([0.7, 1])} />
      <Stack.Screen name="backdate" options={sheetOptions([0.74])} />
      <Stack.Screen name="entry/[id]" options={sheetOptions([1])} />
      <Stack.Screen name="context/[id]" options={sheetOptions([1])} />
      <Stack.Screen name="settings" options={sheetOptions([1])} />
    </Stack>
  );
}
