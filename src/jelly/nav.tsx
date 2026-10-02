// Native navigation chrome shared by Jelly's routes: form sheet options and the stack
// that gives Day, Week and Stuff their native headers.

import { Stack } from 'expo-router';
import { View } from 'react-native';

import { useRunning } from '@/core';

import { useTheme } from './theme';
import { Toast } from './Toast';

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
 */
export function TabStack() {
  const t = useTheme();
  const running = useRunning();
  const tint = running ? t.candy[running.context.hue].ink : t.c.pinkDeep;
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          // Each screen sets its own title; this keeps the route name out of the error screen's header.
          title: '',
          contentStyle: { backgroundColor: t.c.bg },
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerTintColor: tint,
          headerTitleStyle: { color: t.c.ink },
          headerLargeTitleStyle: { color: t.c.ink },
        }}
      />
      <Toast lift={running ? 56 : 0} />
    </View>
  );
}
