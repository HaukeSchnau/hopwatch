import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Print } from './Body';
import { body } from './theme';

/** A printed section label with a hairline running to an optional hint on the right. */
export function Section({ label, hint, style }: { label: string; hint?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <Print size={8} weight="bold" color={body.ink2}>
        {label}
      </Print>
      <View style={styles.rule} />
      {typeof hint === 'string' ? (
        <Print size={7.5} color={body.ink3}>
          {hint}
        </Print>
      ) : (
        hint
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(0,0,0,0.14)' },
});
