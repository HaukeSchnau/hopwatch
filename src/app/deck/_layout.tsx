import { Doto_800ExtraBold, Doto_900Black } from '@expo-google-fonts/doto';
import { MartianMono_400Regular, MartianMono_500Medium, MartianMono_700Bold } from '@expo-google-fonts/martian-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { prepareSounds } from '@/directions/deck/feedback';
import { sheetOptions } from '@/directions/deck/sheet';
import { body } from '@/directions/deck/theme';
import { useHideSplash } from '@/shell/splash';

// Sheets opened by link or route still sit on top of the device.
export const unstable_settings = { anchor: '(modes)' };

/** Deck: the device modes live in (modes); editors open as sheets over them. */
export default function DeckLayout() {
  const [fontsLoaded] = useFonts({
    Doto_800ExtraBold,
    Doto_900Black,
    MartianMono_400Regular,
    MartianMono_500Medium,
    MartianMono_700Bold,
  });
  useHideSplash(fontsLoaded);
  useEffect(() => prepareSounds(), []);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: body.base }} />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: body.base } }}>
        <Stack.Screen name="(modes)" />
        <Stack.Screen name="entry/[id]" options={sheetOptions([0.75, 1])} />
        <Stack.Screen name="context/[id]" options={sheetOptions([1])} />
        <Stack.Screen name="browse" options={sheetOptions([0.62, 1])} />
        <Stack.Screen name="fill" options={sheetOptions([0.78, 1])} />
        <Stack.Screen name="assign" options={sheetOptions([0.62, 1])} />
      </Stack>
    </>
  );
}
