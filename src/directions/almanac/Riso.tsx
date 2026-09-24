import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import type { Hue } from '@/core';

import { ink, riso } from './theme';

/**
 * A flat risograph fill with a key-plate outline printed slightly off register, the
 * way a two-drum riso never quite lines up. Children sit on top of both.
 */
export function Riso({
  hue,
  style,
  children,
  offset = { x: 1.5, y: 1 },
  outline = true,
  shift,
  opacity = 1,
}: {
  hue: Hue;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  offset?: { x: number; y: number };
  outline?: boolean;
  /** Animated misregistration, in points; overrides `offset` when set. */
  shift?: SharedValue<number>;
  opacity?: number;
}) {
  const shifted = useAnimatedStyle(() =>
    shift ? { transform: [{ translateX: shift.value }, { translateY: shift.value * 0.6 }] } : {},
  );
  return (
    <View style={style}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          { backgroundColor: riso[hue].fill, opacity },
          !shift && { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
          shifted,
        ]}
      />
      {outline && <View style={[StyleSheet.absoluteFill, styles.outline]} />}
      {children}
    </View>
  );
}

/** A small printed dot in a context's ink, with its outline off register. */
export function RisoDot({ hue, size = 10, style }: { hue: Hue; size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.fill,
          { borderRadius: size / 2, backgroundColor: riso[hue].fill, transform: [{ translateX: 1 }, { translateY: 0.8 }] },
        ]}
      />
      <View style={[StyleSheet.absoluteFill, styles.outline, { borderRadius: size / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { mixBlendMode: 'multiply' },
  outline: { borderWidth: 1, borderColor: ink.full },
});
