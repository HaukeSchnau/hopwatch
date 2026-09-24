import { Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { colors } from '@/directions/jelly/theme';
import { useHideSplash } from '@/shell/splash';

/** Sheets share one look: cream, grabber, big rounded corners. */
const sheet = (detents: number[]) =>
  ({
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 34,
    contentStyle: { backgroundColor: colors.cream },
  }) as const;

export default function JellyLayout() {
  const [loaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  useHideSplash(loaded);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="start" options={sheet([0.8])} />
        <Stack.Screen name="stop" options={sheet([0.86])} />
        <Stack.Screen name="pick" options={sheet([0.62, 0.95])} />
        <Stack.Screen name="context" options={sheet([0.95])} />
        <Stack.Screen name="entry" options={sheet([0.9])} />
      </Stack>
    </>
  );
}
