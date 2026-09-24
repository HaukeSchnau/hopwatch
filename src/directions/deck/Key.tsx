import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect, useRef } from 'react';
import { type DimensionValue, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { keyDown, keyUp } from './feedback';
import { shade } from './theme';

export interface KeyProps {
  /** Cap color. */
  color: string;
  height: number;
  width?: DimensionValue;
  /** Visible side wall at rest, i.e. the key's travel. */
  depth?: number;
  radius?: number;
  /** Held down like a latching switch, e.g. the running context's key. */
  latched?: boolean;
  /** Transport keys click harder. */
  heavy?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Padding and alignment of the legend area on the cap. */
  capStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const pressSpring = { damping: 13, stiffness: 620, mass: 0.55 };

/**
 * A keycap with real travel: the cap face sinks over its side wall on press-in with a
 * click haptic, then springs back, or stays down while `latched`. Legends go in
 * `children`; without a `width` the key sizes to its legend. Actions fire on release,
 * so scrolling over keys never triggers them.
 */
export function Key({
  color,
  height,
  width,
  depth = 7,
  radius = 11,
  latched = false,
  heavy = false,
  disabled = false,
  onPress,
  onLongPress,
  children,
  style,
  capStyle,
  accessibilityLabel,
}: KeyProps) {
  const latchY = depth * 0.58;
  const pressedY = depth - 1;
  const travel = useSharedValue(latched ? latchY : 0);
  const pressed = useRef(false);

  useEffect(() => {
    if (!pressed.current) travel.set(withSpring(latched ? latchY : 0, pressSpring));
  }, [latched, latchY, travel]);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: travel.get() }] }));
  // A key pressed into the body catches less light.
  const shadeStyle = useAnimatedStyle(() => ({ opacity: (travel.get() / depth) * 0.14 }));

  const side = shade(color, -0.32);
  const sideDark = shade(color, -0.5);
  const faceHeight = height - depth;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: latched }}
      disabled={disabled}
      delayLongPress={380}
      onPressIn={() => {
        pressed.current = true;
        travel.set(withTiming(pressedY, { duration: 45 }));
        keyDown(heavy);
      }}
      onPressOut={() => {
        pressed.current = false;
        travel.set(withSpring(latched ? latchY : 0, pressSpring));
        keyUp();
      }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[{ height, width }, style]}>
      <View style={[styles.well, { borderRadius: radius + 3 }]} />
      <View style={[StyleSheet.absoluteFill, styles.skirt, { borderRadius: radius, backgroundColor: side }]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
          <LinearGradient
            colors={['transparent', sideDark]}
            start={{ x: 0, y: 0.55 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
      <Animated.View
        style={[
          styles.face,
          { height: faceHeight, borderRadius: radius, backgroundColor: color, opacity: disabled ? 0.6 : 1 },
          faceStyle,
        ]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.05)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} />
        <View style={[styles.rim, { borderRadius: radius }]} />
        <View style={[styles.cap, capStyle]}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  well: {
    position: 'absolute',
    left: -3,
    right: -3,
    top: -2,
    bottom: -3,
    backgroundColor: 'rgba(60,52,40,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  skirt: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2.5 },
    shadowOpacity: 0.3,
    shadowRadius: 2.5,
  },
  face: { overflow: 'hidden' },
  shade: { backgroundColor: '#000' },
  rim: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.5)',
    borderLeftColor: 'rgba(255,255,255,0.2)',
    borderRightColor: 'rgba(0,0,0,0.08)',
    borderBottomColor: 'rgba(0,0,0,0.18)',
  },
  cap: { flexGrow: 1 },
});
