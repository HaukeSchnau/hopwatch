// Small building blocks shared by Jelly's screens: squishy pressables, candy-coated
// surfaces, buttons and section titles. Colors come from the current theme.

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  type GestureResponderEvent,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import type { Hue } from '@/core';

import { buzz } from './feedback';
import { symbolWeight } from './symbolWeight';
import { alpha, type Candy, rounded, springs, text, useTheme } from './theme';

/**
 * An icon name: an SF Symbol, or `{ ios, android }` with a Material Symbol for Android. A
 * plain SF Symbol shows nothing on Android.
 */
export type IconName = SymbolViewProps['name'];

interface IconProps {
  name: IconName;
  size: number;
  color: string;
  /** The SF Symbol's weight. Android always uses bold Material Symbols, to sit with the candy type. */
  weight?: SymbolWeight;
}

/**
 * A symbol: SF Symbols on iOS, Material Symbols on Android. Material Symbols only come
 * outlined, so Android draws `stop` and `play_arrow` solid itself, like their SF twins.
 */
export function Icon({ name, size, color, weight }: IconProps) {
  if (Platform.OS === 'android' && typeof name === 'object' && (name.android === 'stop' || name.android === 'play_arrow')) {
    return <Solid shape={name.android} size={size} color={color} />;
  }
  return (
    <SymbolView name={name} size={size} tintColor={color} weight={symbolWeight(weight)} />
  );
}

/** A solid stop square or play triangle in a `size` box. */
function Solid({ shape, size, color }: { shape: 'stop' | 'play_arrow'; size: number; color: string }) {
  const side = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {shape === 'stop' ? (
        <View style={{ width: side, height: side, borderRadius: size * 0.16, backgroundColor: color }} />
      ) : (
        // A border triangle, nudged right so it looks centered.
        <View
          style={{
            marginLeft: size * 0.14,
            borderLeftWidth: side * 0.9,
            borderTopWidth: side / 2,
            borderBottomWidth: side / 2,
            borderLeftColor: color,
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
          }}
        />
      )}
    </View>
  );
}

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
  const t = useTheme();
  const c = palette ?? t.candy[hue];
  return (
    <View
      style={[
        { borderRadius: radius, backgroundColor: c.fill },
        !flat &&
          (Platform.OS === 'android'
            ? // The same colored shadow; Android ignores the shadow props.
              { boxShadow: [{ offsetX: 0, offsetY: 6, blurRadius: 10, color: alpha(c.deep, t.dark ? 0.5 : 0.35) }] }
            : { shadowColor: c.deep, shadowOpacity: t.dark ? 0.5 : 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }),
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

interface JellyButtonProps {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  hue?: Hue;
  palette?: Candy;
  icon?: IconName;
  size?: 'large' | 'medium' | 'small';
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** A gummy pill button. */
export function JellyButton({ label, onPress, onLongPress, hue, palette, icon, size = 'medium', style, disabled, accessibilityHint }: JellyButtonProps) {
  const t = useTheme();
  const c = palette ?? t.candy[hue ?? 'pink'];
  const height = size === 'large' ? 58 : size === 'medium' ? 50 : 40;
  const fontSize = size === 'large' ? 20 : size === 'medium' ? 17 : 15;
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
        {icon && <Icon name={icon} size={fontSize} color={c.on} weight="bold" />}
        <Text style={[styles.buttonLabel, { fontSize, color: c.on }]} numberOfLines={1}>
          {label}
        </Text>
      </CandySurface>
    </Squishy>
  );
}

interface RoundButtonProps {
  icon: IconName;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
  palette?: Candy;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/** A round gummy icon button. */
export function RoundButton({ icon, onPress, onLongPress, size = 44, palette, accessibilityLabel, accessibilityHint }: RoundButtonProps) {
  const t = useTheme();
  const c = palette ?? t.plainCandy;
  return (
    <Squishy
      onPress={onPress}
      onLongPress={onLongPress}
      amount={0.14}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={Math.max(0, (44 - size) / 2)}>
      <CandySurface palette={c} radius={size / 2} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={size * 0.4} color={c.on} weight="bold" />
      </CandySurface>
    </Squishy>
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

/** A section heading in the page's own voice: bold rounded ink, with an optional control. */
export function SectionTitle({ children, right, style }: { children: ReactNode; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={[text.title3, { color: t.c.ink }]}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonLabel: { ...rounded('700'), letterSpacing: 0.1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
});
