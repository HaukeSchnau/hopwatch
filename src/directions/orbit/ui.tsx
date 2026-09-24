import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { durationParts, type ResolvedContext, useNow } from '@/core';

import { alpha, font, label, neon, sky } from './theme';

export const hueOf = (context: Pick<ResolvedContext, 'hue'>) => neon[context.hue];

/** A small caps label in mono. */
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[label, style]}>{children}</Text>;
}

/**
 * A live duration since `since`, ticking every second. Minutes stay h:mm; seconds are
 * a smaller flourish. Keep this a leaf so only it re-renders.
 */
export function LiveDuration({
  since,
  size = 40,
  color = sky.text,
  seconds = true,
}: {
  since: number;
  size?: number;
  color?: string;
  seconds?: boolean;
}) {
  const now = useNow(seconds ? 1000 : 15_000);
  const { hours, minutes, seconds: s } = durationParts(now - since);
  return (
    <Text style={[styles.duration, { fontSize: size, color }]} numberOfLines={1}>
      {hours}:{String(minutes).padStart(2, '0')}
      {seconds && <Text style={[styles.seconds, { fontSize: size * 0.45 }]}>{` ${String(s).padStart(2, '0')}`}</Text>}
    </Text>
  );
}

/** A context's emoji inside a glowing ring, or its initial when it has none. */
export function Moon({ context, size = 28, filled = false }: { context: ResolvedContext; size?: number; filled?: boolean }) {
  const color = hueOf(context);
  return (
    <View
      style={[
        styles.moon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: alpha(color, 0.8),
          backgroundColor: alpha(color, filled ? 0.3 : 0.12),
          shadowColor: color,
        },
      ]}>
      <Glyph context={context} size={size * 0.5} />
    </View>
  );
}

export function Glyph({ context, size }: { context: ResolvedContext; size: number }) {
  if (context.glyph) return <Text style={{ fontSize: size, lineHeight: size * 1.25 }}>{context.glyph}</Text>;
  return (
    <Text style={{ fontFamily: font.textBold, fontSize: size * 0.95, color: hueOf(context) }}>
      {context.name.slice(0, 1).toUpperCase()}
    </Text>
  );
}

/** A dot of light in a context color. */
export function GlowDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: size,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable that sinks on touch with a spring. `style` sizes and styles the pressable itself. */
export function Squish({
  style,
  children,
  scaleTo = 0.94,
  haptic = true,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  scaleTo?: number;
  haptic?: boolean;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      style={[style, animated]}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 15, stiffness: 400 }));
        if (haptic) Haptics.selectionAsync();
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 12, stiffness: 260 }));
        props.onPressOut?.(e);
      }}>
      {children}
    </AnimatedPressable>
  );
}

type SymbolName = SymbolViewProps['name'];

/** A round icon button with a 44 pt target. */
export function IconButton({
  name,
  onPress,
  color = sky.dim,
  size = 18,
  accessibilityLabel,
  style,
}: {
  name: SymbolName;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Squish onPress={onPress} accessibilityLabel={accessibilityLabel} accessibilityRole="button" style={[styles.iconButton, style]}>
      <SymbolView name={name} size={size} tintColor={color} weight="medium" />
    </Squish>
  );
}

/** A capsule button. `tone` colors it; `solid` fills it. */
export function PillButton({
  title,
  onPress,
  tone = sky.accent,
  solid = false,
  icon,
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  tone?: string;
  solid?: boolean;
  icon?: SymbolName;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Squish
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={[
        styles.pill,
        {
          borderColor: alpha(tone, solid ? 0.9 : 0.45),
          backgroundColor: solid ? tone : alpha(tone, 0.1),
          shadowColor: tone,
          shadowOpacity: solid ? 0.55 : 0,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {icon && <SymbolView name={icon} size={15} tintColor={solid ? sky.bg : tone} weight="semibold" />}
      <Text style={[styles.pillText, { color: solid ? sky.bg : tone }]} numberOfLines={1}>
        {title}
      </Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
  duration: {
    fontFamily: font.display,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  seconds: {
    fontFamily: font.mono,
    color: sky.dim,
    letterSpacing: 0,
  },
  moon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.25,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  pillText: {
    fontFamily: font.textBold,
    fontSize: 16,
    letterSpacing: -0.1,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    padding: 3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  knob: { width: 22, height: 22, borderRadius: 11 },
});

/** An on/off toggle drawn in Orbit's style: a dark track that lights up in `color`. */
export function Toggle({ value, onChange, color, accessibilityLabel }: { value: boolean; onChange: (value: boolean) => void; color: string; accessibilityLabel: string }) {
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: withSpring(value ? 20 : 0, { damping: 16, stiffness: 260 }) }] }));
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onChange(!value);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.toggle,
        value
          ? { backgroundColor: alpha(color, 0.35), borderColor: color, shadowColor: color, shadowOpacity: 0.6 }
          : { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: sky.hairlineHi, shadowOpacity: 0 },
      ]}>
      <Animated.View style={[styles.knob, { backgroundColor: value ? '#FFFFFF' : sky.dim }, knob]} />
    </Pressable>
  );
}
