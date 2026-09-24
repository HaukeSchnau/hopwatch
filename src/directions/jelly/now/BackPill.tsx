// "Back to Job": the most prominent control on Now, a big gummy pill in the color of
// the context it returns to. Reads "Resume Job" when nothing runs. Long-press starts
// that context at an earlier time.

import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { actions, useSwitchTarget } from '@/core';

import { candy, fonts } from '../theme';
import { CandySurface, Squishy } from '../ui';
import { noteSource, useAnchor } from './choreo';

export function BackPill() {
  const target = useSwitchTarget();
  const anchor = useAnchor('back');
  if (!target) return null;
  const { kind, context } = target;
  const c = candy[context.hue];
  const verb = kind === 'back' ? 'Back to' : 'Resume';
  return (
    <Squishy
      amount={0.07}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={`${verb} ${context.name}`}
      accessibilityHint="Hold to start it at an earlier time"
      onPress={() => {
        noteSource(context.id, 'back');
        actions.back();
      }}
      onLongPress={() => router.push({ pathname: '/jelly/start', params: { context: context.id } })}>
      <CandySurface hue={context.hue} radius={34} style={styles.pill}>
        <View ref={anchor} style={styles.badge}>
          <Text style={styles.emoji} allowFontScaling={false}>
            {context.glyph ?? '🍬'}
          </Text>
        </View>
        <Text style={[styles.label, { color: c.on }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          <Text style={styles.verb}>{verb} </Text>
          {context.name}
        </Text>
        <View style={[styles.icon, { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
          <SymbolView name={kind === 'back' ? 'arrow.uturn.backward' : 'play.fill'} size={17} tintColor={c.on} weight="heavy" />
        </View>
      </CandySurface>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16 },
  pill: { height: 68, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 12, gap: 12 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 25 },
  label: { flex: 1, fontFamily: fonts.displayBold, fontSize: 23, letterSpacing: -0.2 },
  verb: { fontFamily: fonts.displayMedium },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
