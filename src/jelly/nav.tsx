// Native navigation chrome shared by Jelly's routes: form sheet options, the stack that
// gives Day, Week and Stuff their native headers, and icons for those headers' buttons.

import { Stack, useRoute } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { type ImageSourcePropType, Platform, View } from 'react-native';

import { useRunning } from '@/core';

import { MiniPlayerCard } from './MiniPlayer';
import { ScreenTab } from './showing';
import { headerFont, useTheme } from './theme';
import { Toast } from './Toast';
import { useSymbolImage } from './ui';

/** Stack options for a form sheet with a grabber resting at `detents` (fractions of the screen). */
export const sheet = (detents: number[], background: string) =>
  ({
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    contentStyle: { backgroundColor: background },
  }) as const;

/**
 * The stack inside a tab: a transparent native header over the page, its buttons tinted
 * with the running jelly's candy color. The toast lives here, above the stack's native
 * views, and rises above the mini player that shows while something runs.
 *
 * Android's header is solid instead, so pages start below it and the status bar, and the
 * mini player is a card under the stack (see MiniPlayerCard).
 *
 * As a tab's screen, it tells the screens inside which tab they're in (see showing.ts).
 */
export function TabStack() {
  const t = useTheme();
  const tab = useRoute().name;
  const running = useRunning();
  const tint = running ? t.candy[running.context.hue].ink : t.c.pinkDeep;
  const stack = (
    <Stack
      screenOptions={{
        // Each screen sets its own title; this keeps the route name out of the error screen's header.
        title: '',
        contentStyle: { backgroundColor: t.c.bg },
        headerShadowVisible: false,
        headerTintColor: tint,
        headerTitleStyle: { color: t.c.ink, ...headerFont },
        ...(Platform.OS === 'android'
          ? ({ headerStyle: { backgroundColor: t.c.bg }, headerTitleAlign: 'center' } as const)
          : ({ headerTransparent: true, headerLargeTitleShadowVisible: false, headerLargeTitleStyle: { color: t.c.ink } } as const)),
      }}
    />
  );
  if (Platform.OS === 'android') {
    return (
      <ScreenTab value={tab}>
        <View style={{ flex: 1, backgroundColor: t.c.bg }}>
          <View style={{ flex: 1 }}>
            {stack}
            <Toast />
          </View>
          <MiniPlayerCard />
        </View>
      </ScreenTab>
    );
  }
  return (
    <ScreenTab value={tab}>
      <View style={{ flex: 1 }}>
        {stack}
        <Toast lift={running ? 56 : 0} />
      </View>
    </ScreenTab>
  );
}

/**
 * The icon for a `Stack.Toolbar.Button`: the SF Symbol on iOS. Android's header buttons only
 * take images, so there the Material Symbol is drawn to one first, and the button stays
 * hidden until it's ready.
 */
export function useHeaderIcon(sf: SFSymbol, md: AndroidSymbol): SFSymbol | ImageSourcePropType | undefined {
  const image = useSymbolImage(Platform.OS === 'android' ? md : undefined);
  return Platform.OS === 'android' ? (image ?? undefined) : sf;
}
