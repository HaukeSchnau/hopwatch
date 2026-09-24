import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { actions, type ContextId, type ResolvedContext, usePinned, useRunning } from '@/core';

import { Print } from '../Body';
import { CapLegend, legendOf } from '../CapLegend';
import { Key } from '../Key';
import { Led } from '../Led';
import { body, capColor } from '../theme';

const COLUMNS = 3;
export const KEY_HEIGHT = 64;
const blankCap = '#E6E2DA';

/**
 * Pinned contexts as keycaps in fixed slots. Empty slots are blank caps that assign a
 * context to that slot. The running context's key stays latched with its LED lit.
 */
export function Keypad({ onRewind }: { onRewind: (id: ContextId) => void }) {
  const { slots } = usePinned();
  const runningId = useRunning()?.context.id ?? null;
  const count = Math.max(9, Math.ceil(slots.length / COLUMNS) * COLUMNS);
  const cells = Array.from({ length: count }, (_, i) => slots[i] ?? null);
  const rows = Array.from({ length: count / COLUMNS }, (_, r) => cells.slice(r * COLUMNS, r * COLUMNS + COLUMNS));

  return (
    <View style={styles.pad}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((context, i) => (
            <Slot
              key={r * COLUMNS + i}
              slot={r * COLUMNS + i}
              context={context}
              running={context !== null && context.id === runningId}
              onRewind={onRewind}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

interface SlotProps {
  slot: number;
  context: ResolvedContext | null;
  running: boolean;
  onRewind: (id: ContextId) => void;
}

function Slot({ slot, context, running, onRewind }: SlotProps) {
  return (
    <View style={styles.cell}>
      <View style={styles.head}>
        <Print size={7} color={running ? body.ink : body.ink3} weight={running ? 'bold' : 'medium'}>
          {String(slot + 1).padStart(2, '0')}
        </Print>
        <Led on={running} size={6} />
      </View>
      {context ? (
        <Key
          color={capColor[context.hue]}
          height={KEY_HEIGHT}
          latched={running}
          accessibilityLabel={`Start ${context.name}`}
          onPress={() => actions.start(context.id)}
          onLongPress={() => onRewind(context.id)}
          capStyle={styles.cap}>
          <CapLegend {...legendOf(context)} />
        </Key>
      ) : (
        <Key
          color={blankCap}
          height={KEY_HEIGHT}
          depth={5}
          accessibilityLabel={`Assign key ${slot + 1}`}
          onPress={() => router.push({ pathname: '/deck/assign', params: { slot: String(slot) } })}
          capStyle={styles.blank}>
          <Print size={16} color="rgba(0,0,0,0.16)" weight="regular">
            +
          </Print>
        </Key>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1, gap: 5 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  cap: { paddingHorizontal: 9, paddingTop: 7, paddingBottom: 8 },
  blank: { alignItems: 'center', justifyContent: 'center' },
});
