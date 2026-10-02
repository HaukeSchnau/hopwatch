// The stage at the top of Now: today's candy dial with the running jelly awake in its
// middle, its name and a big timer. The square's corners hold the greeting, today's
// total, "since 09:12" and Stop. When the running context changes, the stage plans the
// hop; when the new jelly lands in the ring, its bean lights up.

import { BlurMask, Canvas, Oval } from '@shopify/react-native-skia';
import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
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

import {
  actions,
  addDays,
  formatClock,
  formatDayMonth,
  formatDuration,
  formatWeekday,
  type ResolvedContext,
  type Running,
  startOfDay,
  useDayReport,
  useNow,
  useTree,
} from '@/core';
import { menuText } from '@/i18n/menus';
import { nowText } from '@/i18n/now';

import { Character } from '../Character';
import { CandyDial, dayBeans } from '../dial/CandyDial';
import { dialFrame } from '../dial/geometry';
import { buzz, play } from '../feedback';
import { useFace, useLively, wake } from '../Gummy';
import { Menu } from '../Menu';
import { onStopMenu, stopMenu } from '../menus';
import { Mould } from '../Mould';
import { springs, tabular, text, useTheme } from '../theme';
import { Timer } from '../Timer';
import { RoundButton } from '../ui';
import { choreograph, useAnchor, useChoreo } from './choreo';

export const STAGE_BLOB = 104;

export function Stage({ running }: { running: Running | null }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const size = Math.min(width - 28, 372);
  const frame = dialFrame(size, 26, 22);
  const tree = useTree();
  const shownId = useChoreo((s) => s.shownId);
  const shown = shownId ? (tree.byId.get(shownId) ?? null) : null;
  const inFlight = useChoreo((s) => s.flights.some((f) => f.kind === 'in' && !f.landed));
  const runningId = running?.context.id ?? null;

  // The hop only plays where it can be seen, and not with Reduce Motion.
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const animate = useRef(focused && !reduced);
  useEffect(() => {
    animate.current = focused && !reduced;
  }, [focused, reduced]);

  // The stage starts with whatever runs, without a flight.
  const previous = useRef(runningId);
  useLayoutEffect(() => {
    useChoreo.setState({ flights: [], shownId: previous.current });
  }, []);
  useEffect(() => {
    if (previous.current === runningId) return;
    const from = previous.current;
    previous.current = runningId;
    choreograph(from, runningId, animate.current);
  }, [runningId]);

  // Lights the new running bean up as its jelly lands in the ring.
  const ignite = useSharedValue(1);
  const light = () => {
    if (reduced) return;
    ignite.set(0);
    ignite.set(withTiming(1, { duration: 950, easing: Easing.out(Easing.cubic) }));
  };

  const now = useNow(15_000);
  const dayStart = startOfDay(now);
  const report = useDayReport(dayStart);
  const beans = dayBeans(report, running, now);

  return (
    <View style={[styles.stage, { width: size, height: size }]}>
      <CandyDial frame={frame} dayStart={dayStart} dayEnd={addDays(dayStart, 1)} beans={beans} now={now} ignite={ignite} />
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
        <BlobSpot shown={shown} empty={!running && !inFlight} onLand={light} />
        {running ? <Readout context={running.context} since={running.entry.startUtc} /> : <Idle />}
      </View>
      <View style={[styles.corner, styles.topLeft]} pointerEvents="none">
        <Text style={[text.headline, { color: t.c.ink }]}>{nowText.greeting(new Date(now).getHours())}</Text>
        <Text style={[text.footnote, { color: t.c.muted }]}>
          {formatWeekday(now)} {formatDayMonth(now)}
        </Text>
      </View>
      <Pressable
        onPress={() => router.navigate('/day')}
        accessibilityRole="button"
        accessibilityLabel={nowText.todayLabel(formatDuration(report.totals.total))}
        hitSlop={8}
        style={({ pressed }) => [styles.corner, styles.topRight, pressed && { opacity: 0.5 }]}>
        <Text style={[text.headline, tabular, { color: t.c.ink }]}>{formatDuration(report.totals.total)}</Text>
        <Text style={[text.footnote, { color: t.c.muted }]}>{nowText.today}</Text>
      </Pressable>
      {running && <Since context={running.context} since={running.entry.startUtc} />}
      {running && <Stop context={running.context} since={running.entry.startUtc} />}
    </View>
  );
}

/** The jelly in the middle of the ring: breathing, hopping now and then, squashing when it lands. */
function BlobSpot({ shown, empty, onLand }: { shown: ResolvedContext | null; empty: boolean; onLand: () => void }) {
  const t = useTheme();
  const anchor = useAnchor('stage');
  const face = useFace('awake');
  const reduced = useReducedMotion();
  useLively(face, shown !== null && !reduced);

  const breath = useSharedValue(0);
  const squash = useSharedValue(0);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    breath.set(withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breath, reduced]);

  // Land with a squash whenever a new jelly arrives on the stage.
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
    onLand();
  }, [face, onLand, shownId, squash]);

  // Every so often the awake jelly does a happy little hop.
  useEffect(() => {
    if (!shownId || reduced) return;
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
  }, [hop, reduced, shownId, squash]);

  const body = useAnimatedStyle(() => {
    const b = breath.get() * 0.035;
    const s = squash.get();
    return { transform: [{ translateY: -hop.get() * 14 }, { scaleY: 1 + b - s }, { scaleX: 1 - b * 0.5 + s * 0.8 }] };
  });
  const floor = useAnimatedStyle(() => ({
    opacity: (t.dark ? 0.5 : 0.2) - hop.get() * 0.1,
    transform: [{ scaleX: 1 - hop.get() * 0.25 + squash.get() * 0.5 }],
  }));

  return (
    <View style={styles.spot}>
      {shown && (
        <Animated.View style={[styles.floor, floor]}>
          <Canvas style={{ width: STAGE_BLOB * 0.8, height: 22 }}>
            <Oval x={STAGE_BLOB * 0.1} y={6} width={STAGE_BLOB * 0.6} height={10} color={t.dark ? '#000000' : t.c.ink}>
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
          <Mould seed="empty-stage" size={STAGE_BLOB} color={t.c.faint} fill={t.dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)'} />
        ) : null}
      </View>
    </View>
  );
}

function Readout({ context, since }: { context: ResolvedContext; since: number }) {
  const t = useTheme();
  const path = context.ancestors.map((a) => a.name).join(' › ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/start', params: { context: context.id } })}
      accessibilityRole="button"
      accessibilityLabel={nowText.runningLabel(context.name, formatClock(since))}
      style={styles.readout}>
      {path ? (
        <Text style={[text.caption, styles.path, { color: t.candy[context.hue].ink }]} numberOfLines={1} ellipsizeMode="head">
          {path}
        </Text>
      ) : null}
      <Text style={[text.title2, styles.name, { color: t.c.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {context.name}
      </Text>
      <Timer since={since} size={40} />
    </Pressable>
  );
}

function Idle() {
  const t = useTheme();
  return (
    <View style={styles.readout}>
      <Text style={[text.title3, { color: t.c.ink }]}>{nowText.nothingRunning}</Text>
      <Text style={[text.subhead, styles.idleHint, { color: t.c.muted }]}>{nowText.idleHint}</Text>
    </View>
  );
}

/** "since 09:12": tap to correct when it really started. */
function Since({ context, since }: { context: ResolvedContext; since: number }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/start', params: { context: context.id } })}
      accessibilityRole="button"
      accessibilityLabel={nowText.startedLabel(formatClock(since))}
      hitSlop={10}
      style={({ pressed }) => [styles.corner, styles.bottomLeft, pressed && { opacity: 0.5 }]}>
      <Text style={[text.footnote, { color: t.c.muted }]}>{nowText.since}</Text>
      <View style={styles.sinceRow}>
        <Text style={[text.headline, tabular, { color: t.c.ink }]}>{formatClock(since)}</Text>
        <SymbolView name="pencil" size={12} tintColor={t.c.muted} weight="bold" />
      </View>
    </Pressable>
  );
}

/** Stop: tap to stop now, hold for the native "stopped earlier" menu. */
function Stop({ context, since }: { context: ResolvedContext; since: number }) {
  const t = useTheme();
  const now = useNow(60_000);
  return (
    <View style={[styles.corner, styles.bottomRight]}>
      <Menu title={menuText.stop(context.name)} items={stopMenu(context.name, since, now)} onPress={onStopMenu}>
        <RoundButton
          icon="stop.fill"
          size={54}
          palette={t.inkCandy}
          accessibilityLabel={menuText.stop(context.name)}
          accessibilityHint={menuText.stopHint}
          onPress={() => {
            actions.stop();
            play('boop');
          }}
        />
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignSelf: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', paddingBottom: 6 },
  spot: { width: STAGE_BLOB + 8, alignItems: 'center', justifyContent: 'flex-end', height: STAGE_BLOB + 6 },
  blob: { width: STAGE_BLOB, height: STAGE_BLOB, position: 'absolute', top: 0 },
  fill: { flex: 1 },
  floor: { position: 'absolute', bottom: 0 },
  readout: { alignItems: 'center', maxWidth: 230, marginTop: 2 },
  path: { textTransform: 'uppercase', letterSpacing: 0.6, maxWidth: 200 },
  name: { maxWidth: 220, marginTop: -1 },
  idleHint: { marginTop: 2, textAlign: 'center' },
  corner: { position: 'absolute' },
  topLeft: { left: 4, top: 0 },
  topRight: { right: 4, top: 0, alignItems: 'flex-end' },
  bottomLeft: { left: 4, bottom: 2 },
  bottomRight: { right: 0, bottom: 0 },
  sinceRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
