import type { NativeStackNavigationOptions } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font, sky } from './theme';

/** Stack options for Orbit's form sheets. */
export function sheetOptions(detents: number[]): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 30,
    contentStyle: { backgroundColor: sky.panel },
  };
}

/** Title row of a sheet, with optional controls on either side. */
export function SheetHeader({ title, kicker, left, right }: { title: string; kicker?: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>{left}</View>
      <View style={styles.titles}>
        {kicker && <Text style={styles.kicker}>{kicker}</Text>}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    zIndex: 1,
    backgroundColor: sky.panel,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 10,
  },
  side: { width: 88 },
  titles: { flex: 1, alignItems: 'center' },
  kicker: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    color: sky.dim,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: { fontFamily: font.display, fontSize: 17, color: sky.text, letterSpacing: -0.2 },
});
