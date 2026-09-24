import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeOutDown, SlideInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { actions, useContextById, useUndoToast } from '@/core';

import { useTabBarClearance } from './TabBar';
import { alpha, font, neon, sky } from './theme';
import { GlowDot } from './ui';

const WINDOW = 5000;

/** "Switched to Dog · Undo", floating above the tab bar with a draining fuse. */
export function UndoToast() {
  const { action, visible } = useUndoToast(WINDOW);
  const context = useContextById(action?.contextId);
  const bottom = useTabBarClearance();
  if (!visible || !action) return null;
  const color = context ? neon[context.hue] : sky.accent;

  return (
    <Animated.View
      key={action.at}
      entering={SlideInDown.springify().damping(18).stiffness(220)}
      exiting={FadeOutDown.duration(180)}
      style={[styles.wrap, { bottom: bottom - 6 }]}>
      <View style={[styles.toast, { borderColor: alpha(color, 0.35), shadowColor: color }]}>
        <GlowDot color={color} size={8} />
        <Text style={styles.label} numberOfLines={1}>
          {action.label}
        </Text>
        <Pressable
          hitSlop={10}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            actions.undo();
          }}
          accessibilityRole="button"
          style={styles.undo}>
          <Text style={styles.undoText}>Undo</Text>
        </Pressable>
        <Fuse at={action.at} color={color} />
      </View>
    </Animated.View>
  );
}

/** A hairline that burns down over the undo window. */
function Fuse({ at, color }: { at: number; color: string }) {
  const progress = useSharedValue(Math.max(0, 1 - (Date.now() - at) / WINDOW));
  useEffect(() => {
    const remaining = Math.max(0, at + WINDOW - Date.now());
    progress.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
  }, [at, progress]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return <Animated.View style={[styles.fuse, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 6,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#11141D',
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: '100%',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  label: { flexShrink: 1, fontFamily: font.textMedium, fontSize: 15, color: sky.text },
  undo: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    justifyContent: 'center',
    backgroundColor: alpha(sky.accent, 0.12),
  },
  undoText: { fontFamily: font.textBold, fontSize: 14, color: sky.accent },
  fuse: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    height: 1.5,
    opacity: 0.7,
    transformOrigin: 'left',
  },
});
