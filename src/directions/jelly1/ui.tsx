// Small building blocks shared by Jelly's screens: squishy pressables, candy-coated
// surfaces, buttons, chips and text styles.

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ReactNode, useEffect } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Hue } from '@/core';

import { buzz } from './feedback';
import { type Candy, candy, colors, fonts, springs } from './theme';

type SymbolName = SymbolViewProps['name'];

interface SquishyProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  /** Styles the squishing body. */
  style?: StyleProp<ViewStyle>;
  /** Styles the pressable around it, e.g. `flex: 1` inside a row. */
  outerStyle?: StyleProp<ViewStyle>;
  /** How far the press squashes, 0 … 0.3. */
  amount?: number;
  haptic?: boolean;
  /** Squash towards the bottom edge, like jelly pressed onto a plate. */
  grounded?: boolean;
}

/**
 * A pressable that squashes like jelly under the finger and wobbles back on release.
 * The animation never delays `onPress`.
 */
export function Squishy({
  children,
  style,
  outerStyle,
  amount = 0.1,
  haptic = true,
  grounded = false,
  onPressIn,
  onPressOut,
  onLongPress,
  ...rest
}: SquishyProps) {
  const squash = useSharedValue(0);
  const animated = useAnimatedStyle(() => {
    const s = squash.get();
    return { transform: [{ scaleX: 1 + s * 0.6 }, { scaleY: 1 - s }] };
  });
  return (
    <Pressable
      {...rest}
      style={outerStyle}
      onPressIn={(e) => {
        squash.set(withSpring(amount, springs.snappy));
        if (haptic) buzz.squish();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        squash.set(withSpring(0, springs.wobble));
        onPressOut?.(e);
      }}
      onLongPress={
        onLongPress &&
        ((e: GestureResponderEvent) => {
          buzz.thud();
          squash.set(withSequence(withTiming(-amount * 0.6, { duration: 90 }), withSpring(0, springs.wobble)));
          onLongPress(e);
        })
      }>
      <Animated.View style={[style, grounded && { transformOrigin: 'bottom' }, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

interface CandySurfaceProps {
  hue?: Hue;
  /** A custom palette instead of a hue. */
  palette?: Candy;
  radius: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Skip the colored drop shadow, e.g. inside lists. */
  flat?: boolean;
}

/** A glossy candy-coated rounded surface: gradient body, top gloss and a colored shadow. */
export function CandySurface({ hue = 'pink', palette, radius, style, children, flat = false }: CandySurfaceProps) {
  const c = palette ?? candy[hue];
  return (
    <View
      style={[
        { borderRadius: radius, backgroundColor: c.fill },
        !flat && { shadowColor: c.deep, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
        style,
      ]}>
      <LinearGradient
        colors={[c.light, c.fill, c.deep]}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: Math.min(5, radius * 0.18),
          left: radius * 0.55,
          width: '28%',
          height: Math.min(8, radius * 0.3),
          borderRadius: 99,
          backgroundColor: 'rgba(255,255,255,0.34)',
        }}
      />
      {children}
    </View>
  );
}

/** Custom palettes for non-context buttons. */
export const inkCandy: Candy = {
  fill: '#3A2852',
  light: '#5B4677',
  deep: '#20122F',
  on: '#FFFFFF',
  tint: colors.sunken,
  glow: 'rgba(32,18,47,0.3)',
};

export const creamCandy: Candy = {
  fill: '#FFFBF6',
  light: '#FFFFFF',
  deep: '#F3E2D0',
  on: colors.ink,
  tint: colors.sunken,
  glow: 'rgba(120,80,60,0.18)',
};

interface JellyButtonProps {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  hue?: Hue;
  palette?: Candy;
  icon?: SymbolName;
  size?: 'large' | 'medium' | 'small';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** A gummy pill button. */
export function JellyButton({ label, onPress, onLongPress, hue, palette, icon, size = 'medium', style, disabled, accessibilityHint }: JellyButtonProps) {
  const c = palette ?? candy[hue ?? 'pink'];
  const height = size === 'large' ? 60 : size === 'medium' ? 50 : 40;
  const fontSize = size === 'large' ? 21 : size === 'medium' ? 18 : 15;
  return (
    <Squishy
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      <CandySurface palette={c} radius={height / 2} style={[styles.button, { height, paddingHorizontal: height * 0.45 }]}>
        {icon && <SymbolView name={icon} size={fontSize} tintColor={c.on} weight="bold" />}
        <Text style={[styles.buttonLabel, { fontSize, color: c.on }]} numberOfLines={1}>
          {label}
        </Text>
      </CandySurface>
    </Squishy>
  );
}

interface RoundButtonProps {
  icon: SymbolName;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
  palette?: Candy;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/** A round gummy icon button. */
export function RoundButton({ icon, onPress, onLongPress, size = 44, palette = creamCandy, accessibilityLabel, accessibilityHint }: RoundButtonProps) {
  return (
    <Squishy
      onPress={onPress}
      onLongPress={onLongPress}
      amount={0.14}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={Math.max(0, (44 - size) / 2)}>
      <CandySurface palette={palette} radius={size / 2} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <SymbolView name={icon} size={size * 0.42} tintColor={palette.on} weight="bold" />
      </CandySurface>
    </Squishy>
  );
}

/** A gummy on/off switch: the knob slides with a jelly stretch and the track fills with candy. */
export function JellySwitch({
  value,
  onValueChange,
  color = colors.pink,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.set(withSpring(value ? 1 : 0, { damping: 12, stiffness: 220 }));
  }, [on, value]);
  const knob = useAnimatedStyle(() => {
    const t = on.get();
    const stretch = Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * 0.35;
    return { transform: [{ translateX: t * 22 }, { scaleX: 1 + stretch }, { scaleY: 1 - stretch * 0.4 }] };
  });
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.get(), [0, 1], [colors.sunken, color]) }));
  return (
    <Pressable
      onPress={() => {
        buzz.tick();
        onValueChange(!value);
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={{ opacity: disabled ? 0.4 : 1 }}>
      <Animated.View style={[styles.switchTrack, track]}>
        <Animated.View style={[styles.switchKnob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * A cream fade over the top edge of a scroll area, so content melts away under a fixed
 * header instead of being sliced off. Place it after the scroll view, inside a
 * `flex: 1` wrapper.
 */
export function EdgeFade({ height = 40 }: { height?: number }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.cream, 'rgba(255,244,232,0.85)', 'rgba(255,244,232,0)']}
      locations={[0, 0.35, 1]}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}
    />
  );
}

/** A little squishy wiggle for "that did nothing" moments. */
export function useWiggle() {
  const r = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get()}deg` }] }));
  const wiggle = () =>
    r.set(withSequence(withTiming(-7, { duration: 60 }), withTiming(6, { duration: 80 }), withSpring(0, springs.wobble)));
  return { style, wiggle };
}

export function SectionTitle({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonLabel: { fontFamily: fonts.display, letterSpacing: 0.1 },
  switchTrack: { width: 54, height: 32, borderRadius: 16, padding: 3, justifyContent: 'center' },
  switchKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
});
