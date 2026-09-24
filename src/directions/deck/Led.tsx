import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { led } from './theme';

/** A small indicator LED set into the body. Lights up with a quick fade and a glow. */
export function Led({ on, size = 7, color = led.on }: { on: boolean; size?: number; color?: string }) {
  const lit = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    lit.set(withTiming(on ? 1 : 0, { duration: on ? 70 : 160 }));
  }, [on, lit]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: lit.get() }));

  return (
    <View style={[styles.socket, { width: size + 3, height: size + 3, borderRadius: (size + 3) / 2 }]}>
      <View style={[styles.off, { width: size, height: size, borderRadius: size / 2 }]} />
      <Animated.View
        style={[
          styles.on,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color, shadowColor: color },
          glowStyle,
        ]}>
        <View style={[styles.core, { width: size * 0.45, height: size * 0.45, borderRadius: size }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  socket: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.7)',
  },
  off: { position: 'absolute', backgroundColor: led.off, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.25)' },
  on: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  core: { backgroundColor: led.core, opacity: 0.85 },
});
