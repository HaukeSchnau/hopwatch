import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type ResolvedContext, useRunning, useTree } from '@/core';

import { Body, Print } from '../Body';
import { ContextList, ROW_HEIGHT } from '../ContextList';
import { useDevParam } from '../devParams';
import { DeviceHeader } from '../Header';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Led } from '../Led';
import { UndoStrip } from '../UndoStrip';
import { body, capNeutral, lcd } from '../theme';

const openProgram = (c: ResolvedContext) => router.push({ pathname: '/deck/context/[id]', params: { id: c.id } });

/**
 * TREE: every context as a file browser on the display. Tap a row to start it, EDIT
 * to program it. Archived contexts hide behind the ARCHIVE key.
 */
export function TreeScreen() {
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const running = useRunning();
  const [archived, setArchived] = useState(false);
  const contexts = archived ? tree.ordered : tree.ordered.filter((c) => !c.hidden);
  const archivedCount = tree.ordered.filter((c) => c.archivedAt !== null).length;

  // Development: `?edit=N` opens the program screen of the Nth context.
  const editParam = useDevParam('edit');
  const editApplied = useRef(false);
  useEffect(() => {
    const context = editParam ? tree.ordered[Number(editParam) - 1] : undefined;
    if (editApplied.current || !context) return;
    editApplied.current = true;
    openProgram(context);
  }, [editParam, tree]);

  return (
    <Body>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <DeviceHeader mode="TREE" />
        <View style={styles.controls}>
          <Key color={body.accent} height={44} width={96} heavy onPress={() => router.push({ pathname: '/deck/context/[id]', params: { id: 'new' } })} capStyle={styles.center}>
            <Print size={9} weight="bold" color="#FFFFFF" spacing={1.2}>
              + NEW
            </Print>
          </Key>
          <Key color={capNeutral} height={44} style={{ flex: 1 }} latched={archived} onPress={() => setArchived((a) => !a)} capStyle={styles.archiveCap}>
            <Led on={archived} size={6} />
            <Print size={9} weight="bold" color={body.ink}>
              ARCHIVED · {archivedCount}
            </Print>
          </Key>
        </View>
        <Lcd style={styles.lcd}>
          <ScrollView contentContainerStyle={styles.list} indicatorStyle="white">
            <View style={styles.listHead}>
              <LcdText size={8} color={lcd.dim} glow={false}>
                /{'  '}
                {contexts.length} CONTEXTS
              </LcdText>
              <LcdText size={8} color={lcd.dim} glow={false}>
                TAP TO START
              </LcdText>
            </View>
            <ContextList
              contexts={contexts}
              runningId={running?.context.id}
              selectedId={running?.context.id}
              disabled={() => false}
              meta={(c) => (c.archivedAt !== null ? 'ARCH' : c.pinPosition !== null ? `K${String(c.pinPosition + 1).padStart(2, '0')}` : null)}
              onPick={(c) => (c.hidden ? openProgram(c) : actions.start(c.id))}
              onLongPress={openProgram}
              trailing={(c) => (
                <Pressable style={styles.edit} onPress={() => openProgram(c)} accessibilityRole="button" accessibilityLabel={`Edit ${c.name}`}>
                  <View style={[styles.editRule, { backgroundColor: c.id === running?.context.id ? 'rgba(15,14,13,0.3)' : lcd.line }]} />
                  <LcdText size={8.5} color={c.id === running?.context.id ? lcd.glass : lcd.dim} glow={false}>
                    EDIT
                  </LcdText>
                </Pressable>
              )}
            />
          </ScrollView>
        </Lcd>
        <View style={{ height: 12 }} />
        <UndoStrip bottom={12} />
      </View>
    </Body>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 4, marginBottom: 12 },
  archiveCap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  lcd: { flex: 1, marginHorizontal: 12 },
  list: { paddingBottom: 16 },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 },
  edit: { height: ROW_HEIGHT, width: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  editRule: { width: 1, height: 20 },
});
