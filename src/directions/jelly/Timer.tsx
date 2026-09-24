// A live duration in big rounded digits. Each digit sits in a fixed-width cell so the
// timer never jitters, and a digit that changes drops in with a small jelly bounce.
// Keep it a leaf: it re-renders every second.

import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { withSpring, withTiming } from 'react-native-reanimated';

import { durationParts, useNow } from '@/core';

import { colors, fonts, springs } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

interface TimerProps {
  since: number;
  size?: number;
  color?: string;
  secondsColor?: string;
  seconds?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Timer({ since, size = 52, color = colors.ink, secondsColor = colors.muted, seconds = true, style }: TimerProps) {
  const now = useNow(1000);
  const parts = durationParts(now - since);
  return (
    <View style={[styles.row, style]} accessible accessibilityRole="timer" accessibilityLabel={`${parts.hours} hours ${parts.minutes} minutes`}>
      <Digits text={`${parts.hours}:${pad(parts.minutes)}`} size={size} color={color} />
      {seconds && <Digits text={`:${pad(parts.seconds)}`} size={size * 0.42} color={secondsColor} style={{ marginBottom: size * 0.13 }} />}
    </View>
  );
}

function Digits({ text, size, color, style }: { text: string; size: number; color: string; style?: StyleProp<ViewStyle> }) {
  const chars = [...text];
  return (
    <View style={[styles.row, style]}>
      {chars.map((ch, i) => (
        // Keyed from the right, so a new hour digit doesn't re-key the minutes.
        <Animated.Text
          key={`${chars.length - i}-${ch}`}
          entering={digitIn}
          allowFontScaling={false}
          style={[
            styles.digit,
            { fontSize: size, lineHeight: size * 1.12, color, width: ch === ':' ? size * 0.28 : size * 0.6 },
          ]}>
          {ch}
        </Animated.Text>
      ))}
    </View>
  );
}

function digitIn() {
  'worklet';
  return {
    initialValues: { opacity: 0.3, transform: [{ translateY: -6 }, { scaleY: 0.7 }] },
    animations: {
      opacity: withTiming(1, { duration: 120 }),
      transform: [{ translateY: withSpring(0, springs.jelly) }, { scaleY: withSpring(1, springs.jelly) }],
    },
  };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  digit: { fontFamily: fonts.display, textAlign: 'center', letterSpacing: -0.5 },
});
