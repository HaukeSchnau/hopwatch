// The week in words: Jelly's mascot tells you about the shown week in a pink speech
// bubble, with a ✨ sticker marking that Apple's on-device model wrote it (summary.ts).
// Nothing shows when there's no summary to give.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Character } from '../Character';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { alpha, springs, text, useTheme } from '../theme';
import { type SummaryState, useWeekSummary } from './summary';

/** The app's mascot, the same jelly as in Settings and the icon. */
const mascot: PreviewJelly = { id: 'settings-mascot', hue: 'pink', glyph: '🍬', name: 'Jelly' };

export function WeekSummary({ weekStart }: { weekStart: number }) {
  const summary = useWeekSummary(weekStart);
  return summary ? <Bubble summary={summary} /> : null;
}

function Bubble({ summary }: { summary: SummaryState }) {
  const t = useTheme();
  const c = t.candy.pink;
  const face = useFace('awake');
  useLively(face, true);
  const reduceMotion = useReducedMotion();
  const words = summary === 'writing' ? null : summary.text;

  // A little hop when the words arrive.
  useEffect(() => {
    if (words && !reduceMotion) face.hop.set(withSequence(withTiming(1, { duration: 140 }), withSpring(0, springs.jelly)));
  }, [face, reduceMotion, words]);

  return (
    <Animated.View
      entering={popIn}
      style={styles.row}
      accessible
      accessibilityLabel={summary === 'writing' ? 'Writing a summary of the week' : `Summary by Apple Intelligence. ${summary.text}`}>
      <Character context={mascot} size={46} face={face} sticker={false} />
      <View style={[styles.bubble, { backgroundColor: c.tint }]}>
        <View style={[styles.tail, { backgroundColor: c.tint }]} />
        {summary === 'writing' ? (
          <Writing color={alpha(c.deep, t.dark ? 0.4 : 0.22)} />
        ) : (
          <Animated.View key={summary.text} entering={FadeIn.duration(260)}>
            <Text style={[styles.words, { color: t.c.ink, opacity: summary.stale ? 0.55 : 1 }]}>{summary.text}</Text>
          </Animated.View>
        )}
        <Text style={styles.sparkle}>✨</Text>
      </View>
    </Animated.View>
  );
}

/** Three soft lines breathing while the first summary is written. */
function Writing({ color }: { color: string }) {
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 750 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View style={[styles.lines, style]}>
      {(['100%', '88%', '56%'] as const).map((width) => (
        <View key={width} style={[styles.line, { width, backgroundColor: color }]} />
      ))}
    </Animated.View>
  );
}

/** The bubble pops in like a gummy. */
function popIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scaleX: 0.86 }, { scaleY: 1.1 }] },
    animations: {
      opacity: withTiming(1, { duration: 140 }),
      transform: [{ scaleX: withSpring(1, springs.wobble) }, { scaleY: withSpring(1, springs.wobble) }],
    },
  };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, marginHorizontal: 16 },
  bubble: { flex: 1, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 15 },
  tail: { position: 'absolute', left: -5, top: 17, width: 14, height: 14, borderRadius: 3, transform: [{ rotate: '45deg' }] },
  words: { ...text.subhead, fontWeight: '500', fontSize: 16, lineHeight: 22 },
  sparkle: { position: 'absolute', top: -10, right: -2, fontSize: 18, transform: [{ rotate: '14deg' }] },
  lines: { gap: 10, paddingVertical: 6 },
  line: { height: 10, borderRadius: 5 },
});
