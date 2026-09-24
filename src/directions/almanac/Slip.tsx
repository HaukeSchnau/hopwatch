// The backdating slip: a paper slip that slides up from a long-press on a word or on
// "Stop the clock". Quick amounts are one tap; any time is a wheel and a button.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  type ContextId,
  formatAgo,
  formatClock,
  formatDuration,
  formatRelativeDay,
  MINUTE,
  useContextById,
  useEntries,
  useNow,
  useRunning,
  useTree,
} from '@/core';

import { describeCarve } from './effects';
import { font, ink, margin, paper, riso } from './theme';
import { TimeWheel, floorTo5 } from './TimeWheel';
import { Caps, InkLink } from './type';

const START_CHOICES = [5, 10, 15, 30, 45];
const STOP_CHOICES = [5, 10, 15, 30];

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/almanac');
}

export function Slip({ kind, contextId, fromNudge }: { kind: 'start' | 'stop'; contextId: ContextId | null; fromNudge: boolean }) {
  const insets = useSafeAreaInsets();
  const running = useRunning();
  const target = useContextById(kind === 'start' ? contextId : (running?.context.id ?? null));
  const entries = useEntries();
  const tree = useTree();
  const now = useNow(10_000);
  const [at, setAt] = useState(() => floorTo5(Date.now() - (kind === 'start' ? 15 : 5) * MINUTE));

  if (!target || (kind === 'stop' && !running)) {
    return (
      <View style={[styles.slip, { paddingBottom: insets.bottom + 24 }]}>
        <Caps>Nothing to do</Caps>
        <Text style={styles.title}>The clock isn’t running.</Text>
        <InkLink onPress={close} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
          Close
        </InkLink>
      </View>
    );
  }

  const ink_ = riso[target.hue];
  const sameAsRunning = kind === 'start' && running?.context.id === target.id;
  const since = running?.entry.startUtc ?? 0;
  const elapsed = now - since;
  const choices = kind === 'start' ? START_CHOICES : STOP_CHOICES;
  const chosen = Math.min(at, now);

  const commit = (ts: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (kind === 'start') actions.start(target.id, { at: ts });
    else actions.stop({ at: ts });
    close();
  };

  const effect =
    kind === 'start'
      ? sameAsRunning
        ? chosen < since
          ? [`${target.name} now starts at ${formatClock(chosen)}.`, describeCarve(entries, tree, chosen, since, now, running?.entry.id)]
              .filter(Boolean)
              .join(' ')
          : `${target.name} already runs since ${formatClock(since)}.`
        : describeCarve(entries, tree, chosen, null, now)
      : `${target.name} will have run ${formatDuration(Math.max(0, chosen - since))}.`;

  return (
    <View style={[styles.slip, { paddingBottom: insets.bottom + 18 }]}>
      <Caps color={ink_.type}>
        {kind === 'start' ? 'Started earlier' : fromNudge ? `Still on ${target.name}?` : 'Stopped earlier'}
      </Caps>
      <Text style={styles.title} numberOfLines={2}>
        {kind === 'start' ? (
          <>
            {target.glyph ? `${target.glyph} ` : ''}
            <Text style={{ fontFamily: font.displayItalic }}>{target.name}</Text>, since…
          </>
        ) : (
          <>
            Stop <Text style={{ fontFamily: font.displayItalic }}>{target.name}</Text>, as of…
          </>
        )}
      </Text>

      <View style={styles.chips}>
        {choices.map((minutes) => {
          const disabled = kind === 'stop' && minutes * MINUTE > elapsed;
          return (
            <Pressable
              key={minutes}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${minutes} minutes ago`}
              onPress={() => commit(Date.now() - minutes * MINUTE)}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed, disabled && { opacity: 0.25 }]}>
              {({ pressed }) => (
                <>
                  <Text style={[styles.chipFigure, pressed && { color: paper.sheet }]}>{minutes}</Text>
                  <Text style={[styles.chipUnit, pressed && { color: paper.sheet }]}>min</Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.ago}>…minutes ago. Or at a time:</Text>

      <View style={styles.wheel}>
        <TimeWheel
          value={chosen}
          onChange={setAt}
          min={kind === 'stop' ? since : now - 36 * 60 * MINUTE}
          max={now}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => commit(chosen)}
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]}>
        <Text style={styles.primaryText} numberOfLines={1} adjustsFontSizeToFit>
          {kind === 'start' ? `Start ${target.name} at ${formatClock(chosen)}` : `Stop at ${formatClock(chosen)}`}
        </Text>
        <Text style={styles.primaryNote}>
          {formatRelativeDay(chosen, now)} · {formatAgo(now - chosen)}
        </Text>
      </Pressable>
      {effect && <Text style={styles.effect}>{effect}</Text>}
      {fromNudge && (
        <InkLink onPress={close} color={ink.soft} style={styles.keep} textStyle={{ fontSize: 19 }}>
          It’s still going. Keep it running
        </InkLink>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slip: { paddingHorizontal: margin, paddingTop: 26 },
  title: { marginTop: 4, fontFamily: font.display, fontSize: 36, lineHeight: 39, color: ink.full, letterSpacing: -0.4 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 18 },
  chip: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ink.full,
    backgroundColor: paper.sheet,
  },
  chipPressed: { backgroundColor: ink.full },
  chipFigure: { fontFamily: font.display, fontSize: 30, lineHeight: 32, color: ink.full },
  chipUnit: { fontFamily: font.sansBold, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: ink.soft },
  ago: { marginTop: 10, fontFamily: font.textItalic, fontSize: 16, color: ink.soft },
  wheel: { marginTop: 4, marginHorizontal: -margin },
  primary: {
    marginTop: 6,
    minHeight: 58,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.full,
  },
  primaryText: { fontFamily: font.displayItalic, fontSize: 24, color: paper.sheet },
  primaryNote: { fontFamily: font.sans, fontSize: 11, color: 'rgba(243,237,226,0.65)', letterSpacing: 0.4 },
  effect: { marginTop: 10, fontFamily: font.textItalic, fontSize: 15, lineHeight: 20, color: ink.soft, textAlign: 'center' },
  keep: { marginTop: 14, alignSelf: 'center' },
});
