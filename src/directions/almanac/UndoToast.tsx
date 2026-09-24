import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, useUndoToast } from '@/core';

import { font, ink, paper } from './theme';

const WINDOW_MS = 5000;

/**
 * "Switched to Dog · Undo", printed on a strip of label tape at the foot of every
 * page. The hairline under it burns down while the undo window is open.
 */
export function UndoToast() {
  const { action, visible } = useUndoToast(WINDOW_MS);
  const insets = useSafeAreaInsets();
  if (!action || !visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom: insets.bottom + 10 }]}>
      <Animated.View
        key={action.at}
        entering={SlideInDown.springify().damping(17).stiffness(220)}
        exiting={SlideOutDown.duration(180)}
        style={styles.tape}>
        <Text numberOfLines={1} style={styles.label}>
          {action.label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Undo: ${action.label}`}
          hitSlop={14}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            actions.undo();
          }}
          style={({ pressed }) => [styles.undo, pressed && { opacity: 0.6 }]}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
        <Burn startedAt={action.at} />
      </Animated.View>
    </View>
  );
}

/** The fuse along the bottom edge of the tape. */
function Burn({ startedAt }: { startedAt: number }) {
  const left = Math.max(0, startedAt + WINDOW_MS - Date.now());
  const progress = useSharedValue(left / WINDOW_MS);
  useEffect(() => {
    progress.value = withTiming(0, { duration: left, easing: Easing.linear });
  }, [left, progress]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return <Animated.View style={[styles.burn, style]} />;
}

const styles = StyleSheet.create({
  dock: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  tape: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    backgroundColor: ink.full,
    paddingLeft: 18,
    paddingRight: 6,
    minHeight: 50,
    transform: [{ rotate: '-1.2deg' }],
    boxShadow: '0 6px 18px rgba(28, 26, 23, 0.28)',
    overflow: 'hidden',
  },
  label: {
    flexShrink: 1,
    fontFamily: font.displayItalic,
    fontSize: 21,
    color: paper.sheet,
    paddingVertical: 10,
  },
  undo: { marginLeft: 12, paddingHorizontal: 12, height: 50, justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(243,237,226,0.35)' },
  undoText: { fontFamily: font.sansBold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: '#FF8FC8' },
  burn: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: ink.red, transformOrigin: 'left' },
});
