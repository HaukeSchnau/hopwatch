// The toast above the tab bar: "Switched to Dog · Undo" after any timeline change, and
// short notes like "Copied" from Jelly itself. Pops in like a gummy, never blocks taps.

import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { withSpring, withTiming, ZoomOut } from 'react-native-reanimated';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { actions, useUndoToast } from '@/core';

import { buzz } from './feedback';
import { springs, text, useTheme } from './theme';

const useNote = create<{ text: string; at: number; visible: boolean } | null>(() => null);

/** Shows a short message in the toast for a moment, e.g. "Copied Acme". */
export function say(message: string) {
  const at = Date.now();
  useNote.setState({ text: message, at, visible: true }, true);
  setTimeout(() => useNote.setState((s) => (s && s.at === at ? { ...s, visible: false } : s), true), 2200);
}

/** The window's home-indicator inset. Insets measured inside a tab include the tab bar. */
const HOME = initialWindowMetrics?.insets.bottom ?? 34;

/** Floats just above the tab bar; `lift` raises it above the mini player. */
export function Toast({ lift = 0 }: { lift?: number }) {
  const t = useTheme();
  const bottom = HOME + 64 + lift;
  const { action, visible } = useUndoToast(5000);
  const note = useNote();

  // The newest of the two wins.
  const showNote = note?.visible && (!visible || !action || note.at > action.at);
  const showUndo = !showNote && visible && action;
  const toast = [styles.toast, { backgroundColor: t.c.toast, shadowColor: t.dark ? '#000000' : t.c.ink }];

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      {showNote ? (
        <Animated.View key={`note-${note.at}`} entering={popIn} exiting={ZoomOut.duration(160)} style={toast}>
          <Text style={[text.callout, styles.text, { color: t.c.onToast }]} numberOfLines={1}>
            {note.text}
          </Text>
        </Animated.View>
      ) : showUndo ? (
        <Animated.View key={`undo-${action.at}`} entering={popIn} exiting={ZoomOut.duration(160)} style={toast}>
          <Pressable onPress={() => actions.dismissLastAction()} style={styles.label} accessibilityLabel={`${action.label}. Dismiss`}>
            <Text style={[text.callout, styles.text, { color: t.c.onToast }]} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              buzz.thud();
              actions.undo();
              actions.dismissLastAction();
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Undo"
            style={({ pressed }) => [styles.undo, { backgroundColor: t.c.pink }, pressed && { transform: [{ scale: 0.92 }] }]}>
            <SymbolView name="arrow.uturn.backward" size={13} tintColor="#FFFFFF" weight="heavy" />
            <Text style={[text.headline, styles.undoText]}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function popIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 26 }, { scaleX: 0.7 }, { scaleY: 1.2 }] },
    animations: {
      opacity: withTiming(1, { duration: 120 }),
      transform: [
        { translateY: withSpring(0, springs.jelly) },
        { scaleX: withSpring(1, springs.wobble) },
        { scaleY: withSpring(1, springs.wobble) },
      ],
    },
  };
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 26,
    paddingLeft: 20,
    paddingRight: 7,
    height: 52,
    maxWidth: '100%',
    minWidth: 160,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  label: { flexShrink: 1, alignSelf: 'stretch', justifyContent: 'center' },
  text: { flexShrink: 1, paddingRight: 8 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, height: 40, paddingHorizontal: 14 },
  undoText: { color: '#FFFFFF' },
});
