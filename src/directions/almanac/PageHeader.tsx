import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font, ink } from './theme';
import { Caps, Rule } from './type';

/** Pops the page, or goes to the front page when there is nothing to pop to. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/almanac');
}

/**
 * A section's running head: a way back to the front page and the folio, then the
 * section title set large over a heavy rule.
 */
export function PageHeader({
  title,
  folio,
  backLabel = 'The Daily Stint',
  right,
}: {
  title: string;
  folio: string;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <View>
      <View style={styles.running}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Back to ${backLabel}`}
          hitSlop={12}
          onPress={() => {
            Haptics.selectionAsync();
            goBack();
          }}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.5 }]}>
          <Text style={styles.backText}>‹ {backLabel}</Text>
        </Pressable>
        <Caps>{folio}</Caps>
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        {right}
      </View>
      <Rule weight="heavy" />
    </View>
  );
}

const styles = StyleSheet.create({
  running: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  back: { minHeight: 44, justifyContent: 'center' },
  backText: { fontFamily: font.displayItalic, fontSize: 19, color: ink.full },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, fontFamily: font.display, fontSize: 60, lineHeight: 64, color: ink.full, letterSpacing: -1 },
});
