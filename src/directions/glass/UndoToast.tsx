import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SFSymbol } from 'sf-symbols-typescript';

import { actions, type LastAction, useContextById, useUndoToast } from '@/core';

import { devToastMs } from './devScript';
import { Glass } from './Glass';
import { useTheme } from './theme';

/** Rises from just below its spot with a soft spring. No fade: glass stops rendering at opacity 0. */
function rise() {
  'worklet';
  return {
    initialValues: { transform: [{ translateY: 90 }, { scale: 0.92 }] },
    animations: {
      transform: [{ translateY: withSpring(0, { damping: 28, stiffness: 280 }) }, { scale: withSpring(1, { damping: 28, stiffness: 280 }) }],
    },
  };
}

/** Drops back below the tab bar. */
function sink() {
  'worklet';
  return {
    initialValues: { transform: [{ translateY: 0 }, { scale: 1 }] },
    animations: {
      transform: [
        { translateY: withTiming(140, { duration: 220, easing: Easing.in(Easing.quad) }) },
        { scale: withTiming(0.9, { duration: 220 }) },
      ],
    },
  };
}

const symbols: Record<LastAction['kind'], SFSymbol> = {
  start: 'arrow.left.arrow.right',
  stop: 'stop.fill',
  back: 'arrow.uturn.backward',
  resume: 'play.fill',
  edit: 'pencil',
  delete: 'trash',
  fill: 'plus',
};

/**
 * "Switched to Dog · Undo": a glass capsule that floats above the tab bar for a few
 * seconds after every timeline change. `lift` raises it above the mini player.
 */
export function UndoToast({ lift = 0 }: { lift?: number }) {
  const { action, visible } = useUndoToast(devToastMs ?? 6000);
  const insets = useSafeAreaInsets();
  if (!visible || !action) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents="box-none">
      <Animated.View
        key={action.at}
        entering={rise}
        exiting={sink}
        style={[styles.wrap, { bottom: insets.bottom + 62 + lift }]}>
        <Toast action={action} />
      </Animated.View>
    </View>
  );
}

function Toast({ action }: { action: LastAction }) {
  const theme = useTheme();
  const context = useContextById(action.contextId);
  const hue = context ? theme.hue(context.hue) : null;
  return (
    <Glass style={styles.toast}>
      <View style={[styles.badge, { backgroundColor: hue?.solid ?? theme.fill }]}>
        <SymbolView name={symbols[action.kind]} size={13} weight="bold" tintColor={hue?.onSolid ?? theme.label} />
      </View>
      <Text style={[styles.label, { color: theme.label }]} numberOfLines={1}>
        {action.label}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          actions.undo();
        }}
        style={({ pressed }) => [styles.undo, { backgroundColor: theme.fill, opacity: pressed ? 0.6 : 1 }]}>
        <Text style={[styles.undoText, { color: theme.label }]}>Undo</Text>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  layer: { justifyContent: 'flex-end' },
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    minHeight: 52,
    borderRadius: 26,
    paddingLeft: 10,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    alignSelf: 'center',
  },
  badge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2, flexShrink: 1 },
  undo: { height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center', marginLeft: 6 },
  undoText: { fontSize: 15, fontWeight: '700' },
});
