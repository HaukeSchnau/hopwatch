import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  actions,
  type ContextId,
  formatAgo,
  formatClock,
  formatRelativeDay,
  HOUR,
  isSameDay,
  MINUTE,
  useNow,
  useStint,
  useSwitchTarget,
} from '@/core';

import { alpha, font, neon, sky } from '../theme';
import { Moon, Squish } from '../ui';

/**
 * The most prominent control: "Back to Job" while something runs, "Resume Job" when
 * nothing does. It glows in the target's color. Long-press backdates the switch.
 */
export function BackPill({ onLongPress }: { onLongPress: (id: ContextId) => void }) {
  const target = useSwitchTarget();
  if (!target) return <View style={styles.placeholder} />;
  const { context, kind } = target;
  const color = neon[context.hue];

  return (
    <Animated.View key={`${kind}${context.id}`} entering={FadeIn.duration(220)}>
      <Squish
        scaleTo={0.97}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.back();
        }}
        onLongPress={() => onLongPress(context.id)}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={`${kind === 'back' ? 'Back to' : 'Resume'} ${context.name}. Long-press to switch earlier.`}
        style={[styles.pill, { borderColor: alpha(color, 0.6), backgroundColor: alpha(color, 0.13), shadowColor: color }]}>
        <Moon context={context} size={38} filled />
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            <Text style={{ color: alpha(sky.text, 0.62), fontFamily: font.textMedium }}>{kind === 'back' ? 'Back to ' : 'Resume '}</Text>
            {context.name}
          </Text>
          <LeftAgo contextId={context.id} kind={kind} />
        </View>
        <View style={[styles.icon, { backgroundColor: color, shadowColor: color }]}>
          <SymbolView name={kind === 'back' ? 'arrow.uturn.backward' : 'play.fill'} size={16} tintColor={sky.bg} weight="bold" />
        </View>
      </Squish>
    </Animated.View>
  );
}

/** "left 12 min ago": when the target last stopped. */
function LeftAgo({ contextId, kind }: { contextId: ContextId; kind: 'back' | 'resume' }) {
  const lastEnd = useStint((s) => {
    for (let i = s.entries.length - 1; i >= 0; i--) {
      const e = s.entries[i];
      if (e.contextId === contextId && e.endUtc !== null) return e.endUtc;
    }
    return null;
  });
  const now = useNow(30_000);
  if (lastEnd === null) return null;
  const ago = now - lastEnd;
  const verb = kind === 'back' ? 'left' : 'stopped';
  // Recent stops read as "12 min ago"; older ones as the wall-clock time they ended.
  const when =
    ago < MINUTE
      ? 'just now'
      : ago < HOUR
        ? formatAgo(ago)
        : isSameDay(lastEnd, now)
          ? `at ${formatClock(lastEnd)}`
          : `${formatRelativeDay(lastEnd, now).toLowerCase()} at ${formatClock(lastEnd)}`;
  return (
    <Text style={styles.sub} numberOfLines={1}>
      {verb} {when}
    </Text>
  );
}

const styles = StyleSheet.create({
  placeholder: { height: 8 },
  pill: {
    height: 64,
    marginHorizontal: 20,
    borderRadius: 32,
    borderWidth: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 13,
    gap: 12,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  text: { flex: 1 },
  title: { fontFamily: font.textBold, fontSize: 18, color: sky.text, letterSpacing: -0.3 },
  sub: { marginTop: 1, fontFamily: font.mono, fontSize: 10.5, color: sky.dim, letterSpacing: 0.6 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
