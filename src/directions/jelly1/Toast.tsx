// The toast above the tab bar: "Switched to Dog · Undo" after any timeline change, and
// short notes like "Copied" from Jelly itself. Pops in like a gummy, never blocks taps.

import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { withSpring, withTiming, ZoomOut } from 'react-native-reanimated';
import { create } from 'zustand';

import { actions, useUndoToast } from '@/core';

import { buzz } from './feedback';
import { useTabBarBottom } from './TabBar';
import { colors, fonts, springs, TAB_BAR_HEIGHT } from './theme';

const useNote = create<{ text: string; at: number } | null>(() => null);

/** Shows a short message in the toast, e.g. "Copied Acme". */
export function say(text: string) {
  useNote.setState({ text, at: Date.now() }, true);
}

export function Toast() {
  const bottom = useTabBarBottom() + TAB_BAR_HEIGHT + 12;
  const { action, visible } = useUndoToast(5000);
  const note = useNote();
  const noteVisible = useNoteVisible(note?.at ?? null);

  // The newest of the two wins.
  const showNote = noteVisible && note && (!visible || !action || note.at > action.at);
  const showUndo = !showNote && visible && action;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      {showNote ? (
        <Animated.View key={`note-${note.at}`} entering={popIn} exiting={ZoomOut.duration(160)} style={styles.toast}>
          <Text style={styles.text} numberOfLines={1}>
            {note.text}
          </Text>
        </Animated.View>
      ) : showUndo ? (
        <Animated.View key={`undo-${action.at}`} entering={popIn} exiting={ZoomOut.duration(160)} style={styles.toast}>
          <Pressable onPress={() => actions.dismissLastAction()} style={styles.label} accessibilityLabel={`${action.label}. Dismiss`}>
            <Text style={styles.text} numberOfLines={1}>
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
            style={({ pressed }) => [styles.undo, pressed && { transform: [{ scale: 0.92 }] }]}>
            <SymbolView name="arrow.uturn.backward" size={13} tintColor={colors.white} weight="heavy" />
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function useNoteVisible(at: number | null) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (at === null) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(timer);
  }, [at]);
  return visible;
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
    backgroundColor: colors.ink,
    borderRadius: 26,
    paddingLeft: 20,
    paddingRight: 7,
    height: 52,
    maxWidth: '100%',
    minWidth: 160,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  label: { flexShrink: 1, alignSelf: 'stretch', justifyContent: 'center' },
  text: { flexShrink: 1, fontFamily: fonts.display, fontSize: 16, color: colors.white, paddingRight: 8 },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.pink,
    borderRadius: 20,
    height: 40,
    paddingHorizontal: 14,
  },
  undoText: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.white },
});
