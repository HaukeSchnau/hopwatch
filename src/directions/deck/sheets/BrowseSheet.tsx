import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, usePickableContexts, useRunning } from '@/core';

import { ContextList } from '../ContextList';
import { Lcd, LcdText } from '../Lcd';
import { Sheet } from '../sheet';
import { lcd } from '../theme';

/** The whole tree one tap away from SWITCH: tap any context to start it. */
export function BrowseSheet() {
  const insets = useSafeAreaInsets();
  const contexts = usePickableContexts();
  const running = useRunning();
  return (
    <Sheet title="ALL CONTEXTS" subtitle="TAP TO START" scroll={false}>
      <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Lcd style={styles.lcd}>
          <ScrollView contentContainerStyle={styles.list} indicatorStyle="white">
            <ContextList
              contexts={contexts}
              runningId={running?.context.id}
              selectedId={running?.context.id}
              meta={(c) => (c.pinPosition !== null ? `K${String(c.pinPosition + 1).padStart(2, '0')}` : null)}
              onPick={(c) => {
                actions.start(c.id);
                router.back();
              }}
            />
            {contexts.length === 0 ? (
              <LcdText size={10} color={lcd.dim} style={styles.empty}>
                NO CONTEXTS YET
              </LcdText>
            ) : null}
          </ScrollView>
        </Lcd>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 12 },
  lcd: { flex: 1 },
  list: { paddingVertical: 8 },
  empty: { padding: 16 },
});
