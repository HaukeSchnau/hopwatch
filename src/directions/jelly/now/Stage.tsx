// The stage at the top of Now: the running context's blob, awake and bouncing, with
// its path, a big timer, when it started and the Stop button. When the running context
// changes, the stage plans the hop choreography and lands the new blob with a squash.

import { BlurMask, Canvas, Oval } from '@shopify/react-native-skia';
import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { actions, formatClock, type Running, useTree } from '@/core';

import { Character } from '../Character';
import { buzz, play } from '../feedback';
import { useFace, useLively, wake } from '../Gummy';
import { Mould } from '../Mould';
import { candy, colors, fonts, springs } from '../theme';
import { Timer } from '../Timer';
import { inkCandy, RoundButton } from '../ui';
import { choreograph, useAnchor, useChoreo } from './choreo';

export const STAGE_BLOB = 124;

export function Stage({ running }: { running: Running | null }) {
  const tree = useTree();
  const shownId = useChoreo((s) => s.shownId);
  const shown = shownId ? (tree.byId.get(shownId) ?? null) : null;
  const inFlight = useChoreo((s) => s.flights.some((f) => f.kind === 'in' && !f.landed));
  const runningId = running?.context.id ?? null;
  const hue = running?.context.hue ?? 'gray';

  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);

  // The stage starts with whatever runs, without a flight.
  const previous = useRef(runningId);
  useLayoutEffect(() => {
    useChoreo.setState({ flights: [], shownId: previous.current });
  }, []);
  useEffect(() => {
    if (previous.current === runningId) return;
    const from = previous.current;
    previous.current = runningId;
    choreograph(from, runningId, focusedRef.current);
  }, [runningId]);

  return (
    <View style={[styles.stage, { backgroundColor: running ? candy[hue].tint : colors.sunken }]}>
      <BlobSpot shown={shown} empty={!running && !inFlight} />
      <View style={styles.info}>{running ? <RunningInfo running={running} /> : <IdleInfo />}</View>
    </View>
  );
}

/** The blob on the stage, breathing, hopping now and then, squashing when it lands. */
function BlobSpot({ shown, empty }: { shown: Running['context'] | null; empty: boolean }) {
  const anchor = useAnchor('stage');
  const face = useFace('awake');
  useLively(face, shown !== null);

  const breath = useSharedValue(0);
  const squash = useSharedValue(0);
  const hop = useSharedValue(0);

  useEffect(() => {
    breath.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breath]);

  // Land with a squash whenever a new blob arrives on the stage.
  const shownId = shown?.id ?? null;
  const lastShown = useRef(shownId);
  useEffect(() => {
    if (shownId === lastShown.current) return;
    lastShown.current = shownId;
    if (!shownId) return;
    squash.set(withSequence(withTiming(0.26, { duration: 70 }), withSpring(0, springs.wobble)));
    wake(face);
    buzz.tap();
    play('pop');
  }, [face, shownId, squash]);

  // Every so often the awake blob does a happy little hop.
  useEffect(() => {
    if (!shownId) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        hop.set(withSequence(withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) })));
        squash.set(withDelay(390, withSequence(withTiming(0.14, { duration: 60 }), withSpring(0, springs.wobble))));
        schedule();
      }, 6000 + Math.random() * 6000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [hop, shownId, squash]);

  const body = useAnimatedStyle(() => {
    const b = breath.get() * 0.035;
    const s = squash.get();
    return {
      transform: [
        { translateY: -hop.get() * 16 },
        { scaleY: 1 + b - s },
        { scaleX: 1 - b * 0.5 + s * 0.8 },
      ],
    };
  });
  const floor = useAnimatedStyle(() => ({
    opacity: 0.22 - hop.get() * 0.1,
    transform: [{ scaleX: 1 - hop.get() * 0.25 + squash.get() * 0.5 }],
  }));

  return (
    <View style={styles.spot}>
      {shown && (
        <Animated.View style={[styles.floor, floor]}>
          <Canvas style={{ width: STAGE_BLOB * 0.8, height: 24 }}>
            <Oval x={STAGE_BLOB * 0.08} y={6} width={STAGE_BLOB * 0.64} height={12} color={colors.ink}>
              <BlurMask blur={5} style="normal" />
            </Oval>
          </Canvas>
        </Animated.View>
      )}
      <View ref={anchor} style={styles.blob}>
        {shown ? (
          <Animated.View style={[styles.fill, { transformOrigin: 'bottom' }, body]}>
            <Character context={shown} size={STAGE_BLOB} face={face} shadow={false} />
          </Animated.View>
        ) : empty ? (
          <Mould seed="empty-stage" size={STAGE_BLOB} color={colors.faint} fill="rgba(255,255,255,0.5)" />
        ) : null}
      </View>
    </View>
  );
}

function RunningInfo({ running }: { running: Running }) {
  const { context, entry } = running;
  const path = context.ancestors.map((a) => a.name).join(' › ');
  const c = candy[context.hue];
  return (
    <>
      {path ? (
        <Text style={[styles.path, { color: c.deep }]} numberOfLines={1} ellipsizeMode="head">
          {path} ›
        </Text>
      ) : null}
      <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
        {context.name}
      </Text>
      <Timer since={entry.startUtc} size={46} style={styles.timer} />
      <View style={styles.row}>
        <Pressable
          onPress={() => router.push({ pathname: '/jelly/start', params: { context: context.id } })}
          accessibilityRole="button"
          accessibilityLabel={`Started at ${formatClock(entry.startUtc)}. Change the start`}
          hitSlop={8}
          style={({ pressed }) => [styles.since, pressed && { opacity: 0.6 }]}>
          <Text style={styles.sinceText}>since {formatClock(entry.startUtc)}</Text>
          <SymbolView name="pencil" size={12} tintColor={colors.muted} weight="bold" />
        </Pressable>
        <RoundButton
          icon="stop.fill"
          size={52}
          palette={inkCandy}
          accessibilityLabel={`Stop ${context.name}`}
          accessibilityHint="Hold to stop at an earlier time"
          onPress={() => {
            actions.stop();
            play('boop');
          }}
          onLongPress={() => router.push('/jelly/stop')}
        />
      </View>
    </>
  );
}

function IdleInfo() {
  return (
    <>
      <Text style={styles.idleTitle}>Nothing running</Text>
      <Text style={styles.idleText}>Tap a jelly to wake it up and start tracking.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginHorizontal: 16,
    borderRadius: 36,
    paddingVertical: 10,
    paddingLeft: 8,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 160,
  },
  spot: { width: STAGE_BLOB + 8, alignItems: 'center', justifyContent: 'flex-end', height: STAGE_BLOB + 12 },
  blob: { width: STAGE_BLOB, height: STAGE_BLOB, position: 'absolute', top: 0 },
  fill: { flex: 1 },
  floor: { position: 'absolute', bottom: 8 },
  info: { flex: 1, paddingLeft: 6, justifyContent: 'center' },
  path: { fontFamily: fonts.textHeavy, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 1 },
  name: { fontFamily: fonts.displayBold, fontSize: 27, lineHeight: 31, color: colors.ink, letterSpacing: -0.3 },
  timer: { marginTop: 2, marginLeft: -2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  since: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  sinceText: { fontFamily: fonts.textBold, fontSize: 15, color: colors.muted },
  idleTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: colors.ink },
  idleText: { fontFamily: fonts.text, fontSize: 15, lineHeight: 20, color: colors.muted, marginTop: 4 },
});
