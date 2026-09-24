import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Print, Screw } from './Body';
import { body } from './theme';

/**
 * The strip at the top of the device: screws, the model print and a speaker grille.
 * Modes other than SWITCH print their name in it.
 */
export function DeviceHeader({ mode, right }: { mode?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Screw angle={28} />
      <View style={styles.brand}>
        <Print size={12} weight="bold" color={body.ink} spacing={1.2}>
          ST-5
        </Print>
        <Print size={7.5} color={body.ink2}>
          {mode ? `· ${mode}` : 'TIME DEVICE'}
        </Print>
      </View>
      <View style={styles.spacer} />
      {right ?? <Grille />}
      <Screw angle={-40} />
    </View>
  );
}

/** A small speaker grille: rows of drilled holes. */
export function Grille() {
  return (
    <View style={styles.grille}>
      {Array.from({ length: 3 }, (_, r) => (
        <View key={r} style={styles.grilleRow}>
          {Array.from({ length: 10 }, (_, c) => (
            <View key={c} style={styles.hole} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 34 },
  brand: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  spacer: { flex: 1 },
  grille: { gap: 3 },
  grilleRow: { flexDirection: 'row', gap: 3 },
  hole: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'rgba(30,26,20,0.55)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.8)',
  },
});
