import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aluminium, Print } from './Body';
import { Key } from './Key';
import { body, capNeutral } from './theme';

/** Stack options for Deck's editors: an aluminium form sheet with a grabber. */
export function sheetOptions(detents: number[]) {
  return {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: detents,
    sheetGrabberVisible: true,
    sheetCornerRadius: 30,
    contentStyle: { backgroundColor: body.base },
  };
}

interface SheetProps {
  /** Printed title, e.g. "ENTRY" or "PROGRAM". */
  title: string;
  /** Small print under the title. */
  subtitle?: string;
  children: ReactNode;
  /** Keys pinned under the scrolling content. */
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** The frame every Deck sheet shares: printed header with a CLOSE key, body, footer. */
export function Sheet({ title, subtitle, children, footer, scroll = true, contentStyle }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.sheet}>
      <Aluminium />
      <View style={styles.header} collapsable={false}>
        <View style={{ flex: 1 }}>
          <Print size={13} weight="bold" color={body.ink} spacing={2}>
            {title}
          </Print>
          {subtitle ? (
            <Print size={9} style={{ marginTop: 4 }} numberOfLines={1}>
              {subtitle}
            </Print>
          ) : null}
        </View>
        <Key color={capNeutral} height={34} width={78} depth={5} radius={9} onPress={() => router.back()} capStyle={styles.center}>
          <Print size={9} weight="bold" color={body.ink}>
            CLOSE
          </Print>
        </Key>
      </View>
      {scroll ? (
        // Wrapped so react-native-screens doesn't stretch it over the header and footer.
        <View style={{ flex: 1 }} collapsable={false}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets>
            {children}
          </ScrollView>
        </View>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: body.base },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 26, paddingBottom: 12, gap: 12 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 18 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
});
