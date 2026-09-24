import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { actions, formatClock, formatDuration, formatLongDay, pathLabel, startOfDay, useEntries, useNow, usePickableContexts, useTree } from '@/core';

import { Print } from '../Body';
import { CapLegend, legendOf } from '../CapLegend';
import { ContextList } from '../ContextList';
import { success } from '../feedback';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Section } from '../Section';
import { Sheet } from '../sheet';
import { TimeJog } from '../TimeJog';
import { body, capColor, capDark, capNeutral, font, lcd, screenColor } from '../theme';

/**
 * One entry on a "program" screen: its context, start, end and note. Every change is
 * applied right away through the domain, so neighbours get trimmed and undo works.
 */
export function EntrySheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useEntries().find((e) => e.id === id) ?? null;
  const tree = useTree();
  const pickable = usePickableContexts();
  const now = useNow(15_000);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState(entry?.note ?? '');
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    router.back();
  };

  // Deleted, undone or trimmed away elsewhere: nothing left to edit.
  useEffect(() => {
    if (!entry) close();
  });

  const context = entry ? tree.byId.get(entry.contextId) : undefined;
  if (!entry || !context) return null;

  const running = entry.endUtc === null;
  const end = entry.endUtc ?? now;
  const saveNote = () => {
    const next = note.trim() ? note.trim() : null;
    if (next !== entry.note) actions.updateEntry(entry.id, { note: next });
  };

  return (
    <Sheet
      title="ENTRY"
      subtitle={formatLongDay(entry.startUtc)}
      footer={
        <>
          <Key
            color={capNeutral}
            height={54}
            style={{ flex: 1 }}
            onPress={() => {
              actions.deleteEntry(entry.id);
              close();
            }}
            capStyle={styles.center}>
            <Print size={10} weight="bold" color="#C8321E" spacing={1.4}>
              DELETE
            </Print>
          </Key>
          <Key
            color={body.accent}
            height={54}
            heavy
            style={{ flex: 1.6 }}
            onPress={() => {
              saveNote();
              success();
              close();
            }}
            capStyle={styles.center}>
            <Print size={11} weight="bold" color="#FFFFFF" spacing={1.5}>
              DONE
            </Print>
          </Key>
        </>
      }>
      <Lcd style={styles.summary} contentStyle={styles.summaryContent}>
        <View style={styles.pathRow}>
          <View style={[styles.pixel, { backgroundColor: screenColor[context.hue] }]} />
          <LcdText size={10} numberOfLines={1} style={{ flex: 1 }}>
            {pathLabel(context).toLocaleUpperCase('en-GB')}
          </LcdText>
          {running ? (
            <View style={styles.rec}>
              <View style={styles.recDot} />
              <LcdText size={9} color={lcd.hot}>
                REC
              </LcdText>
            </View>
          ) : null}
        </View>
        <LcdText dot size={34} color={lcd.hot} style={styles.range}>
          {formatClock(entry.startUtc)}–{running ? 'NOW' : formatClock(end)}
        </LcdText>
        <LcdText size={10} color={lcd.dim}>
          {formatDuration(end - entry.startUtc)} {running ? 'SO FAR' : 'LOGGED'}
        </LcdText>
      </Lcd>

      <Section label="CONTEXT" />
      <View style={styles.contextRow}>
        <View style={{ flex: 1 }}>
          <Key color={capColor[context.hue]} height={64} onPress={() => setPicking((p) => !p)} capStyle={styles.cap}>
            <CapLegend {...legendOf(context)} />
          </Key>
        </View>
        <Key color={capDark} height={64} width={104} onPress={() => setPicking((p) => !p)} capStyle={styles.center}>
          <Print size={9} weight="bold" color="#F4F1EA">
            {picking ? 'KEEP' : 'CHANGE'}
          </Print>
        </Key>
      </View>
      {picking ? (
        <Lcd style={styles.picker}>
          <ScrollView nestedScrollEnabled contentContainerStyle={styles.pickerList} indicatorStyle="white">
            <ContextList
              contexts={pickable}
              selectedId={context.id}
              onPick={(c) => {
                actions.updateEntry(entry.id, { contextId: c.id });
                setPicking(false);
              }}
            />
          </ScrollView>
        </Lcd>
      ) : null}

      <Section label="START" />
      <TimeJog
        value={entry.startUtc}
        day={startOfDay(entry.startUtc)}
        max={end - 60_000}
        onChange={(startUtc) => actions.updateEntry(entry.id, { startUtc })}
      />

      <Section label="END" />
      {running ? (
        <View style={styles.runningRow}>
          <Lcd style={styles.runningLcd} contentStyle={styles.runningContent}>
            <LcdText size={10}>STILL RUNNING</LcdText>
          </Lcd>
          <Key color={capDark} height={52} width={120} heavy onPress={() => actions.stop()} capStyle={styles.center}>
            <Print size={9} weight="bold" color="#F4F1EA">
              STOP NOW
            </Print>
          </Key>
        </View>
      ) : (
        <TimeJog
          value={end}
          day={startOfDay(entry.startUtc)}
          min={entry.startUtc + 60_000}
          max={now}
          onChange={(endUtc) => actions.updateEntry(entry.id, { endUtc })}
        />
      )}

      <Section label="NOTE" />
      <Lcd style={styles.noteLcd} pixels={false} contentStyle={styles.noteContent}>
        <TextInput
          value={note}
          onChangeText={setNote}
          onBlur={saveNote}
          placeholder="What was it?"
          placeholderTextColor={lcd.faint}
          selectionColor={lcd.ink}
          keyboardAppearance="dark"
          multiline
          allowFontScaling={false}
          style={styles.note}
        />
      </Lcd>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  summary: { height: 118 },
  summaryContent: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-between' },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pixel: { width: 8, height: 8 },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B1F' },
  range: { lineHeight: 40 },
  contextRow: { flexDirection: 'row', gap: 12 },
  cap: { paddingHorizontal: 10, paddingTop: 7, paddingBottom: 8 },
  picker: { height: 280 },
  pickerList: { paddingVertical: 6 },
  runningRow: { flexDirection: 'row', gap: 10 },
  runningLcd: { flex: 1, height: 52 },
  runningContent: { justifyContent: 'center', paddingHorizontal: 14 },
  noteLcd: { minHeight: 96 },
  noteContent: { padding: 12 },
  note: { fontFamily: font.monoMedium, fontSize: 13, lineHeight: 19, color: lcd.ink, minHeight: 70, textAlignVertical: 'top' },
});
