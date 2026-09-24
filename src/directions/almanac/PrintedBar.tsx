import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Hue } from '@/core';

import { ink, partner, riso } from './theme';

/**
 * A horizontal bar printed in two riso drums. On mount the bar rolls out, and the
 * second drum lands off register, shivers and settles, the way a print comes out of
 * the machine. Change `printKey` to run the press again.
 */
export function PrintedBar({
  hue,
  fraction,
  height = 10,
  delay = 0,
  printKey,
  marker,
}: {
  hue: Hue;
  /** 0–1 of the track. */
  fraction: number;
  height?: number;
  delay?: number;
  printKey?: string;
  /** Optional target tick, 0–1 of the track. */
  marker?: number;
}) {
  const roll = useSharedValue(0);
  const shift = useSharedValue(7);

  useEffect(() => {
    roll.value = 0;
    shift.value = 7;
    roll.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    shift.value = withDelay(
      delay + 140,
      withSequence(
        withTiming(-2.5, { duration: 160, easing: Easing.out(Easing.quad) }),
        withSpring(2.4, { damping: 6, stiffness: 260, mass: 0.6 }),
      ),
    );
  }, [delay, printKey, roll, shift]);

  const main = useAnimatedStyle(() => ({ transform: [{ scaleX: roll.value }] }));
  const second = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }, { translateY: shift.value * 0.45 }, { scaleX: roll.value }],
  }));

  const width = `${Math.max(0.5, Math.min(1, fraction) * 100)}%` as const;
  return (
    <View style={[styles.track, { height }]}>
      <Animated.View
        style={[styles.layer, { width, backgroundColor: riso[partner[hue]].fill, opacity: 0.8 }, second]}
      />
      <Animated.View style={[styles.layer, styles.top, { width, backgroundColor: riso[hue].fill }, main]} />
      {marker !== undefined && (
        <>
          <View style={[styles.box, { width: `${Math.min(1, marker) * 100}%` }]} />
          <View style={[styles.marker, { left: `${Math.min(1, marker) * 100}%`, height: height + 10 }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { justifyContent: 'center' },
  layer: { position: 'absolute', left: 0, top: 0, bottom: 0, mixBlendMode: 'multiply', transformOrigin: 'left' },
  // The key drum prints on top as itself, so a context's ink reads the same everywhere.
  top: { mixBlendMode: 'normal' },
  marker: { position: 'absolute', width: 2, marginLeft: -1, backgroundColor: ink.full },
  box: { position: 'absolute', left: 0, top: 0, bottom: 0, borderWidth: 1, borderColor: ink.full },
});
