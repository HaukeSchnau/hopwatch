import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { type ContextId, type ResolvedContext, usePinned } from '@/core';

import { alpha, font, neon, sky } from '../theme';
import { Glyph, Squish } from '../ui';

const COLUMNS = 5;
const ORB = 56;

interface OrbGridProps {
  runningId: ContextId | null;
  /** The context being backdated, highlighted while the others step back. */
  selectedId: ContextId | null;
  onPress: (id: ContextId) => void;
  onLongPress: (id: ContextId) => void;
}

/**
 * Pinned contexts as glowing orbs in fixed slots. Holes stay holes, so every orb keeps
 * its place for muscle memory.
 */
export function OrbGrid({ runningId, selectedId, onPress, onLongPress }: OrbGridProps) {
  const { slots } = usePinned();
  const { width } = useWindowDimensions();
  const column = (width - 20) / COLUMNS;

  if (slots.length === 0) {
    return (
      <Squish onPress={() => router.navigate('/orbit/contexts')} style={styles.empty} scaleTo={0.98}>
        <Text style={styles.emptyText}>Pin contexts to keep them here as orbs.</Text>
        <Text style={styles.emptyLink}>Open contexts</Text>
      </Squish>
    );
  }

  return (
    <View style={styles.grid}>
      {slots.map((context, slot) =>
        context ? (
          <Orb
            key={context.id}
            context={context}
            width={column}
            running={context.id === runningId}
            dimmed={selectedId !== null && context.id !== selectedId}
            selected={context.id === selectedId}
            onPress={() => onPress(context.id)}
            onLongPress={() => onLongPress(context.id)}
          />
        ) : (
          <View key={`hole${slot}`} style={[styles.slot, { width: column }]}>
            <View style={styles.hole} />
          </View>
        ),
      )}
    </View>
  );
}

interface OrbProps {
  context: ResolvedContext;
  width: number;
  running: boolean;
  dimmed: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function Orb({ context, width, running, dimmed, selected, onPress, onLongPress }: OrbProps) {
  const color = neon[context.hue];
  const lit = running || selected;
  return (
    <Squish
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={320}
      scaleTo={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${context.name}${running ? ', running' : ''}. Long-press to start earlier.`}
      style={[styles.slot, { width, opacity: dimmed ? 0.35 : 1 }]}>
      <View style={styles.orbBox}>
        {lit && <Halo color={color} />}
        <View
          style={[
            styles.orb,
            {
              borderColor: alpha(color, lit ? 0.95 : 0.7),
              backgroundColor: alpha(color, lit ? 0.32 : 0.09),
              shadowColor: color,
              shadowOpacity: lit ? 0.95 : 0.5,
              shadowRadius: lit ? 16 : 8,
            },
          ]}>
          <Glyph context={context} size={24} />
        </View>
      </View>
      <Text style={[styles.name, lit && { color: sky.text }]} numberOfLines={1}>
        {context.name}
      </Text>
    </Squish>
  );
}

/** The running orb's halo: a faint ring with a moon in orbit. */
function Halo({ color }: { color: string }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.set(withRepeat(withTiming(360, { duration: 5200, easing: Easing.linear }), -1, false));
  }, [turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <>
      <View style={[styles.halo, { borderColor: alpha(color, 0.35) }]} />
      <Animated.View style={[styles.halo, styles.orbitTrack, spin]}>
        <View style={[styles.satellite, { backgroundColor: color, shadowColor: color }]} />
      </Animated.View>
    </>
  );
}

const HALO = ORB + 12;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, rowGap: 8 },
  slot: { alignItems: 'center' },
  orbBox: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center' },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
  },
  halo: {
    position: 'absolute',
    width: HALO,
    height: HALO,
    borderRadius: HALO / 2,
    borderWidth: 1,
  },
  orbitTrack: { borderColor: 'transparent', alignItems: 'center' },
  satellite: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: -3,
    shadowOpacity: 1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  hole: {
    width: ORB - 10,
    height: ORB - 10,
    marginVertical: 11,
    borderRadius: ORB,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: sky.hairline,
  },
  name: {
    marginTop: -2,
    maxWidth: '92%',
    fontFamily: font.textMedium,
    fontSize: 11.5,
    color: sky.dim,
    letterSpacing: -0.1,
  },
  empty: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: sky.hairlineHi,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: { fontFamily: font.text, fontSize: 14, color: sky.dim, textAlign: 'center' },
  emptyLink: { fontFamily: font.textBold, fontSize: 14, color: sky.accent },
});
