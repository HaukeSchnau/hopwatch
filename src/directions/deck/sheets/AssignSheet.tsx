import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, usePickableContexts } from '@/core';

import { Print } from '../Body';
import { ContextList } from '../ContextList';
import { success } from '../feedback';
import { Key } from '../Key';
import { Lcd } from '../Lcd';
import { Sheet } from '../sheet';
import { body } from '../theme';

const keyLabel = (slot: number) => `K${String(slot + 1).padStart(2, '0')}`;

/**
 * Pressing a blank keycap: put a context on that key. Picking a context that already
 * sits on another key moves it here. NEW programs a fresh context for the slot.
 */
export function AssignSheet() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slot: string }>();
  const slot = Number(params.slot ?? 0);
  const contexts = usePickableContexts();

  return (
    <Sheet title={`ASSIGN KEY ${String(slot + 1).padStart(2, '0')}`} subtitle="PICK A CONTEXT, OR PROGRAM A NEW ONE" scroll={false}>
      <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Key
          color={body.accent}
          height={50}
          heavy
          onPress={() => router.replace({ pathname: '/deck/context/[id]', params: { id: 'new', slot: String(slot) } })}
          capStyle={styles.newCap}>
          <Print size={10} weight="bold" color="#FFFFFF" spacing={1.4}>
            + NEW CONTEXT ON THIS KEY
          </Print>
        </Key>
        <Lcd style={styles.lcd}>
          <ScrollView contentContainerStyle={styles.list} indicatorStyle="white">
            <ContextList
              contexts={contexts}
              meta={(c) => (c.pinPosition !== null ? `ON ${keyLabel(c.pinPosition)}` : null)}
              onPick={(c) => {
                if (c.pinPosition === null) actions.pin(c.id);
                actions.movePin(c.id, slot);
                success();
                router.back();
              }}
            />
          </ScrollView>
        </Lcd>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 12, gap: 14 },
  newCap: { alignItems: 'center', justifyContent: 'center' },
  lcd: { flex: 1 },
  list: { paddingVertical: 8 },
});
