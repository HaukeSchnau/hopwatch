import { Stack, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { Appearance, View } from 'react-native';

import { useAlmanacFonts } from '@/directions/almanac/fonts';
import { useNudgeIntent } from '@/directions/almanac/intent';
import { paper } from '@/directions/almanac/theme';
import { UndoToast } from '@/directions/almanac/UndoToast';
import { useHideSplash } from '@/shell/splash';

export const unstable_settings = { anchor: 'index' };

const slip = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: 26,
  contentStyle: { backgroundColor: paper.slip },
} as const;

/**
 * Almanac is printed on light paper in any system appearance, so native pieces (sheets,
 * menus, keyboards, alerts) render light too. Only while Almanac is the focused
 * direction; the Lab and other directions get the system appearance back.
 */
function usePrintedInLight() {
  useFocusEffect(
    useCallback(() => {
      Appearance.setColorScheme('light');
      return () => Appearance.setColorScheme('unspecified');
    }, []),
  );
}

/** Almanac: pages push like turning to a section; slips slide up as form sheets. */
export default function AlmanacLayout() {
  const ready = useAlmanacFonts();
  useHideSplash(ready);
  useNudgeIntent(ready);
  usePrintedInLight();
  if (!ready) return <View style={{ flex: 1, backgroundColor: paper.sheet }} />;

  return (
    <View style={{ flex: 1, backgroundColor: paper.sheet }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: paper.sheet } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="slip" options={slip} />
        <Stack.Screen
          name="pick"
          options={{ ...slip, sheetAllowedDetents: [0.62, 0.95], sheetInitialDetentIndex: 0 }}
        />
      </Stack>
      <UndoToast />
    </View>
  );
}
