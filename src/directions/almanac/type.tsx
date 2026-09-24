// Typographic primitives: small-caps labels, rules, dotted leaders and text links.
// Screens compose these instead of styling raw Text, so the page keeps one voice.

import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { font, ink } from './theme';

/** A small-caps label in the sans, the way newspapers set section heads and bylines. */
export function Caps({
  children,
  color = ink.soft,
  size = 11,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles.caps, { color, fontSize: size, letterSpacing: size * 0.13 }, style]}>
      {children}
    </Text>
  );
}

/** A horizontal rule: a hairline, a regular rule, or the heavy rule under a masthead. */
export function Rule({
  weight = 'hair',
  color = ink.full,
  style,
}: {
  weight?: 'hair' | 'regular' | 'heavy';
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const height = weight === 'hair' ? StyleSheet.hairlineWidth : weight === 'regular' ? 1 : 2.5;
  return <View style={[{ height, backgroundColor: weight === 'hair' ? ink.rule : color }, style]} />;
}

/** A dotted leader that fills the space between a label and its figure. */
export function Leader({ color = ink.faint, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.leader, style]}>
      <Svg width="100%" height={4}>
        <Line
          x1="1"
          y1="2"
          x2="100%"
          y2="2"
          stroke={color}
          strokeWidth={1.6}
          strokeDasharray="0.01 4.5"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Pressable text with an ink underline, the Almanac's button. Fires a light haptic on
 * press so taps feel printed rather than digital.
 */
export function InkLink({
  children,
  onPress,
  onLongPress,
  style,
  textStyle,
  underline = true,
  color = ink.full,
  haptic = true,
  hitSlop = 10,
  accessibilityLabel,
  disabled,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  underline?: boolean;
  color?: string;
  haptic?: boolean;
  hitSlop?: PressableProps['hitSlop'];
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => {
        if (haptic) Haptics.selectionAsync();
        onPress?.();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [style, { opacity: disabled ? 0.35 : pressed ? 0.5 : 1 }]}>
      <Text
        style={[
          styles.link,
          { color },
          underline && { textDecorationLine: 'underline', textDecorationColor: color },
          textStyle,
        ]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caps: {
    fontFamily: font.sansBold,
    textTransform: 'uppercase',
  },
  leader: { flex: 1, height: 4, marginHorizontal: 6, alignSelf: 'center', overflow: 'hidden' },
  link: {
    fontFamily: font.displayItalic,
    fontSize: 20,
  },
});
