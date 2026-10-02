// The pinned grid: sleeping jellies in fixed slots, so they're found by muscle memory
// and color. Tapping one wakes it and it hops into the dial; its slot keeps a dimple
// while it's up there. Holding one opens the native backdating menu.

import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { actions, type ContextId, type ResolvedContext, useNow, usePinned } from '@/core';
import { menuText } from '@/i18n/menus';
import { nowText } from '@/i18n/now';

import { Character } from '../Character';
import { hashSeed } from '../geometry';
import { sleep, useFace, wake } from '../Gummy';
import { Menu } from '../Menu';
import { onStartMenu, useStartMenu } from '../menus';
import { Mould } from '../Mould';
import { useShowing } from '../showing';
import { rounded, springs, text, useTheme } from '../theme';
import { Squishy, useWiggle } from '../ui';
import { isAway, noteSource, tileKey, useAnchor, useChoreo } from './choreo';

const COLUMNS = 3;
const GAP = 8;
const SIDE = 16;

export function Grid({ runningId }: { runningId: ContextId | null }) {
  const { slots } = usePinned();
  const { width } = useWindowDimensions();
  const now = useNow(60_000);
  const cell = Math.floor((width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const showNew = slots.length < 6;
  return (
    <View style={styles.grid}>
      {slots.map((context, i) =>
        context ? (
          <Tile key={context.id} context={context} running={context.id === runningId} width={cell} now={now} />
        ) : (
          <View key={`hole-${i}`} style={{ width: cell }} />
        ),
      )}
      {showNew && <NewTile width={cell} />}
    </View>
  );
}

function Tile({ context, running, width, now }: { context: ResolvedContext; running: boolean; width: number; now: number }) {
  const t = useTheme();
  const size = Math.min(width - 22, 84);
  const anchor = useAnchor(tileKey(context.id));
  // Hidden only once the jelly has left (stage or flight), so a tapped tile never
  // shows an empty dimple before its flyer takes over.
  const hidden = useChoreo((s) => isAway(s, context.id));
  const face = useFace('asleep');
  const reduced = useReducedMotion();
  const showing = useShowing();
  const { style: wiggleStyle, wiggle } = useWiggle();

  // Slow sleepy breathing, each tile on its own phase, while the grid can be seen.
  const breath = useSharedValue(0);
  const land = useSharedValue(0);
  useEffect(() => {
    if (reduced || !showing) return;
    const phase = hashSeed(context.id) % 1800;
    breath.set(withDelay(phase, withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true)));
    return () => {
      cancelAnimation(breath);
      breath.set(0);
    };
  }, [breath, context.id, reduced, showing]);

  // Coming back from the stage: plop into the slot.
  const wasHidden = useRef(hidden);
  useEffect(() => {
    if (wasHidden.current && !hidden) {
      land.set(withSequence(withTiming(0.22, { duration: 60 }), withSpring(0, springs.wobble)));
      face.awake.set(0);
    }
    wasHidden.current = hidden;
  }, [face, hidden, land]);

  const body = useAnimatedStyle(() => {
    const b = breath.get() * 0.028;
    const l = land.get();
    return { transform: [{ scaleY: 1 + b - l }, { scaleX: 1 - b * 0.4 + l * 0.7 }] };
  });

  const c = t.candy[context.hue];
  const menu = useStartMenu(context, now, running);
  return (
    <Menu title={context.name} items={menu} onPress={(id) => onStartMenu(context.id, id, tileKey(context.id))}>
      <Squishy
        grounded
        amount={0.15}
        style={[styles.tile, { width }]}
        accessibilityRole="button"
        accessibilityLabel={running ? nowText.running(context.name) : nowText.switchTo(context.name)}
        accessibilityHint={menuText.startHint}
        onPressIn={() => !hidden && wake(face)}
        onPressOut={() => !hidden && setTimeout(() => sleep(face), 350)}
        onPress={() => {
          if (running) return wiggle();
          noteSource(context.id, tileKey(context.id));
          actions.start(context.id);
        }}>
        <Animated.View style={wiggleStyle}>
          <View ref={anchor} style={{ width: size, height: size }}>
            {/* The jelly stays mounted while away, so it never flashes blank on return. */}
            <Animated.View style={[styles.fill, { transformOrigin: 'bottom', opacity: hidden ? 0 : 1 }, body]}>
              <Character context={context} size={size} face={face} />
            </Animated.View>
            {hidden && (
              <View style={StyleSheet.absoluteFill}>
                <Mould seed={context.id} size={size} color={c.deep} />
              </View>
            )}
          </View>
        </Animated.View>
        <Text style={[text.subhead, styles.label, { color: hidden ? c.ink : t.c.ink }]} numberOfLines={2}>
          {context.name}
        </Text>
      </Squishy>
    </Menu>
  );
}

/** A dashed ghost tile for making another jelly while the grid is still small. */
function NewTile({ width }: { width: number }) {
  const t = useTheme();
  const size = Math.min(width - 22, 84);
  return (
    <Squishy
      grounded
      style={[styles.tile, { width }]}
      accessibilityRole="button"
      accessibilityLabel={nowText.newJelly}
      onPress={() => router.push({ pathname: '/context', params: { pin: '1' } })}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={StyleSheet.absoluteFill}>
          <Mould seed="new-jelly" size={size} color={t.c.muted} />
        </View>
        <Text style={[styles.plus, { color: t.c.muted }]}>+</Text>
      </View>
      <Text style={[text.subhead, styles.label, { color: t.c.muted }]}>{nowText.newJelly}</Text>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SIDE, columnGap: GAP, rowGap: 4 },
  tile: { alignItems: 'center', paddingBottom: 6 },
  fill: { flex: 1 },
  label: { textAlign: 'center', marginTop: -2, paddingHorizontal: 2, lineHeight: 18 },
  plus: { ...rounded('600'), fontSize: 34, marginTop: -8 },
});
