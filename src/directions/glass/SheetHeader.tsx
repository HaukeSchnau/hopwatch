import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassButton } from './Glass';
import { useTheme } from './theme';

/**
 * The top of a React Native sheet: a close button, a centred title, an optional
 * trailing control, and `children` (e.g. a search field) below, like a SwiftUI sheet
 * toolbar. Form sheets expect exactly a header and a ScrollView as their native
 * children, so the header never flattens into its parent.
 */
export function SheetHeader({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View collapsable={false} style={styles.wrap}>
      <View style={styles.header}>
        <GlassButton symbol="xmark" label="Close" onPress={() => router.back()} />
        <View style={styles.titles}>
          <Text style={[styles.title, { color: theme.label }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.secondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>{right}</View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 8 },
  titles: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, marginTop: 1 },
  side: { width: 44, alignItems: 'flex-end' },
});
