// What a route shows instead of crashing the app. Every route file re-exports this as
// expo-router's `ErrorBoundary`. Plain React Native only, so it still renders when Skia,
// gestures or the store are what failed.

import type { ErrorBoundaryProps } from 'expo-router';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { shellText } from '@/i18n/shell';

import { text, useTheme } from './theme';

export function ErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const t = useTheme();
  useEffect(() => console.error(error), [error]);
  const canClose = router.canGoBack();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.c.bg }]}>
      <Text style={styles.emoji}>🫠</Text>
      <Text style={[text.title2, styles.center, { color: t.c.ink }]}>{shellText.error.title}</Text>
      <Text style={[text.body, styles.center, { color: t.c.ink, opacity: 0.7 }]}>
        {shellText.error.body}
      </Text>
      <Text selectable style={[text.footnote, styles.center, { color: t.c.ink, opacity: 0.45 }]}>
        {error.message}
      </Text>
      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.button, { backgroundColor: t.c.pinkDeep, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[text.headline, { color: t.c.bg }]}>{shellText.error.retry}</Text>
        </Pressable>
        {canClose && (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
            <Text style={[text.headline, { color: t.c.pinkDeep }]}>{shellText.error.close}</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emoji: { fontSize: 72, marginBottom: 8 },
  center: { textAlign: 'center' },
  buttons: { marginTop: 16, gap: 8, alignSelf: 'stretch' },
  button: { alignItems: 'center', borderRadius: 16, paddingVertical: 14 },
});
