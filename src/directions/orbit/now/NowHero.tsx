import { BlurMask, Circle, Group, Path } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  type SharedValue,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import {
  addDays,
  formatAgo,
  formatClock,
  formatDuration,
  formatDayMonth,
  formatWeekday,
  MINUTE,
  type Running,
  startOfDay,
  useContextById,
  useDayReport,
  useNow,
  useRunning,
  useStint,
} from '@/core';

import { Dial, type DialArc } from '../Dial';
import { arcPath, type DialFrame, dialFrame, pointDeg, pointRadius, polar, timeAtDeg, timeToDeg } from '../geometry';
import { alpha, font, neon, sky } from '../theme';
import { Glyph, Label, LiveDuration, Squish } from '../ui';
import { type Scrub, snapInto, START_REACH } from './scrub';

interface NowHeroProps {
  scrub: Scrub | null;
  onScrubAt: (at: number) => void;
  onStop: () => void;
  onStopLongPress: () => void;
}

/**
 * The top of the Now screen: today's dial with the running comet, the readout in its
 * center, and the scrub and ignition layers.
 */
export function NowHero({ scrub, onScrubAt, onStop, onStopLongPress }: NowHeroProps) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 40, 350);
  const frame = dialFrame(size, 15, 30);
  const now = useNow(10_000);
  const dayStart = startOfDay(now);
  const dayEnd = addDays(dayStart, 1);
  const report = useDayReport(dayStart);
  const running = useRunning();
  const scrubContext = useContextById(scrub?.kind === 'start' ? scrub.contextId : null);
  const nowDeg = timeToDeg(now, dayStart, dayEnd);

  const arcs: DialArc[] = report.segments.map((s) => ({
    key: s.entry.id,
    start: s.start,
    end: s.running ? Math.max(now, s.start) : s.end,
    color: neon[s.context.hue],
    running: s.running,
  }));

  // The scrub marker follows the chosen instant on a spring; at rest it waits at "now".
  const markerDeg = useSharedValue(nowDeg);
  const scrubAt = scrub?.at ?? null;
  useEffect(() => {
    markerDeg.set(scrubAt === null ? nowDeg : withSpring(timeToDeg(scrubAt, dayStart, dayEnd), { damping: 20, stiffness: 220 }));
  }, [scrubAt, nowDeg, dayStart, dayEnd, markerDeg]);

  const ignition = useIgnition(running);

  // Scrubbing: the finger's angle picks the instant closest to the previous one.
  const latest = useRef(scrubAt);
  useEffect(() => {
    latest.current = scrubAt;
  }, [scrubAt]);
  const bounds = scrub?.kind === 'stop' && running ? { min: running.entry.startUtc, max: now } : { min: now - START_REACH, max: now };
  const track = (x: number, y: number) => {
    if (latest.current === null || pointRadius(frame, x, y) < 28) return;
    const raw = timeAtDeg(pointDeg(frame, x, y), dayStart, dayEnd, latest.current, bounds.min, bounds.max);
    const at = snapInto(raw, bounds.min, bounds.max);
    if (at === latest.current) return;
    latest.current = at;
    Haptics.selectionAsync();
    onScrubAt(at);
  };
  const pan = Gesture.Pan()
    .enabled(scrub !== null)
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => track(e.x, e.y))
    .onUpdate((e) => track(e.x, e.y));

  const scrubColor = scrub?.kind === 'start' && scrubContext ? neon[scrubContext.hue] : sky.danger;

  return (
    <View style={styles.hero}>
      <GestureDetector gesture={pan}>
        <View style={{ width: size, height: size }}>
          {/* The square's empty top corners hold the date and today's total. */}
          <View style={styles.corners} pointerEvents="none">
            <Label>
              {formatWeekday(now)} {formatDayMonth(now)}
            </Label>
            <Label style={{ color: sky.text, textAlign: 'right' }}>
              {formatDuration(report.totals.total)}
              {'\n'}
              <Text style={{ color: sky.dim }}>today</Text>
            </Label>
          </View>
          <Dial frame={frame} dayStart={dayStart} dayEnd={dayEnd} arcs={arcs} now={now}>
            {scrub && <ScrubLayer frame={frame} kind={scrub.kind} markerDeg={markerDeg} nowDeg={nowDeg} color={scrubColor} />}
            <IgnitionLayer frame={frame} fromDeg={nowDeg} ignition={ignition} />
          </Dial>
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="box-none">
            {scrub ? (
              <ScrubReadout scrub={scrub} now={now} running={running} name={scrubContext?.name ?? running?.context.name ?? ''} color={scrubColor} />
            ) : running ? (
              <RunningReadout running={running} onStop={onStop} onStopLongPress={onStopLongPress} />
            ) : (
              <IdleReadout now={now} />
            )}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

function RunningReadout({ running, onStop, onStopLongPress }: { running: Running; onStop: () => void; onStopLongPress: () => void }) {
  const { context, entry } = running;
  const color = neon[context.hue];
  const path = context.ancestors.map((a) => a.name).join(' › ');
  return (
    <Animated.View key={entry.id} entering={FadeIn.duration(260)} style={styles.readout}>
      <Pressable
        onPress={() => router.push({ pathname: '/orbit/entry/[id]', params: { id: entry.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${context.name} running since ${formatClock(entry.startUtc)}. Open the entry.`}
        style={styles.readout}>
        <Animated.View entering={ZoomIn.springify().damping(12).stiffness(200)}>
          <Glyph context={context} size={30} />
        </Animated.View>
        <Text style={styles.name} numberOfLines={1}>
          {context.name}
        </Text>
        {path ? (
          <Text style={[styles.path, { color: alpha(color, 0.85) }]} numberOfLines={1}>
            {path}
          </Text>
        ) : null}
        <View style={{ height: 6 }} />
        <LiveDuration since={entry.startUtc} size={38} />
        <Label style={{ marginTop: 2 }}>
          since {formatClock(entry.startUtc)}
          {entry.note ? ' · note' : ''}
        </Label>
      </Pressable>
      <Squish
        onPress={onStop}
        onLongPress={onStopLongPress}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={`Stop ${context.name}. Long-press to stop earlier.`}
        style={styles.stop}>
        <View style={styles.stopSquare} />
      </Squish>
    </Animated.View>
  );
}

function IdleReadout({ now }: { now: number }) {
  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.readout}>
      <Label>Nothing running</Label>
      <Text style={[styles.clock, { color: sky.dim }]}>{formatClock(now)}</Text>
      <Text style={styles.hint}>Tap an orb to start.{'\n'}Long-press to start earlier.</Text>
    </Animated.View>
  );
}

function ScrubReadout({ scrub, now, running, name, color }: { scrub: Scrub; now: number; running: Running | null; name: string; color: string }) {
  const ago = now - scrub.at;
  const trims = useTrimmed(scrub);
  return (
    <View style={styles.readout}>
      <Label style={{ color: alpha(color, 0.9), maxWidth: 210, textAlign: 'center' }}>
        {scrub.kind === 'start' ? `${name} from` : `Stop ${name} at`}
      </Label>
      <Text style={[styles.clock, { color, textShadowColor: color, textShadowRadius: 18 }]}>{formatClock(scrub.at)}</Text>
      <Text style={styles.ago}>{ago < MINUTE ? 'now' : formatAgo(ago)}</Text>
      {scrub.kind === 'start' && trims && <Text style={styles.trims}>trims {trims}</Text>}
      {scrub.kind === 'stop' && running && (
        <Text style={styles.trims}>{formatDuration(scrub.at - running.entry.startUtc)} in total</Text>
      )}
      <Text style={[styles.hint, { marginTop: 8 }]}>Drag around the ring</Text>
    </View>
  );
}

/** Names of the entries a backdated start would cut into, e.g. "Job". */
function useTrimmed(scrub: Scrub): string | null {
  const entries = useStint((s) => s.entries);
  const tree = useStint((s) => s.tree);
  if (scrub.kind !== 'start') return null;
  const names = new Set<string>();
  for (const e of entries) {
    const end = e.endUtc ?? Number.POSITIVE_INFINITY;
    if (end > scrub.at && e.contextId !== scrub.contextId) names.add(tree.byId.get(e.contextId)?.name ?? '');
  }
  names.delete('');
  return names.size ? [...names].slice(0, 2).join(', ') + (names.size > 2 ? ' …' : '') : null;
}

/** The chosen instant on the ring, and the stretch it adds (start) or cuts (stop). */
function ScrubLayer({
  frame,
  kind,
  markerDeg,
  nowDeg,
  color,
}: {
  frame: DialFrame;
  kind: Scrub['kind'];
  markerDeg: SharedValue<number>;
  nowDeg: number;
  color: string;
}) {
  const path = useDerivedValue(() => arcPath(frame, markerDeg.value, Math.max(nowDeg - markerDeg.value, 0.01)));
  const knob = useDerivedValue(() => polar(frame, markerDeg.value));
  const kx = useDerivedValue(() => knob.value.x);
  const ky = useDerivedValue(() => knob.value.y);
  const { stroke } = frame;

  return (
    <Group>
      {kind === 'start' ? (
        <>
          <Path path={path} style="stroke" strokeWidth={stroke * 1.3} color={color} opacity={0.8}>
            <BlurMask blur={stroke} style="normal" respectCTM />
          </Path>
          <Path path={path} style="stroke" strokeWidth={stroke + 2} color={color} />
          <Path path={path} style="stroke" strokeWidth={1.5} color="#FFFFFF" opacity={0.5} />
        </>
      ) : (
        <>
          <Path path={path} style="stroke" strokeWidth={stroke + 3} color={sky.bg} opacity={0.82} />
          <Path path={path} style="stroke" strokeWidth={1.5} color={color} opacity={0.9} />
        </>
      )}
      <Circle cx={kx} cy={ky} r={stroke * 1.25} color={color} opacity={0.6}>
        <BlurMask blur={stroke * 0.9} style="normal" respectCTM />
      </Circle>
      <Circle cx={kx} cy={ky} r={stroke * 0.78} color="#FFFFFF" />
      <Circle cx={kx} cy={ky} r={stroke * 0.78} color={color} style="stroke" strokeWidth={3} />
    </Group>
  );
}

interface Ignition {
  progress: SharedValue<number>;
  flash: SharedValue<number>;
  color: SharedValue<string>;
}

/**
 * Plays the ignition whenever a switch starts a new entry: a comet in the new color
 * laps the ring once and lands at "now" with a flash.
 */
function useIgnition(running: Running | null): Ignition {
  const progress = useSharedValue(1);
  const flash = useSharedValue(1);
  const color = useSharedValue<string>(sky.accent);
  const runningId = running?.entry.id ?? null;
  const hue = running ? neon[running.context.hue] : null;
  const previous = useRef(runningId);

  useEffect(() => {
    const changed = runningId !== null && runningId !== previous.current;
    previous.current = runningId;
    if (!changed || !hue) return;
    const last = useStint.getState().lastAction;
    if (!last || last.kind === 'edit' || Date.now() - last.at > 2000) return;
    color.set(hue);
    flash.set(0);
    progress.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 950, easing: Easing.bezier(0.45, 0, 0.2, 1) })));
    flash.set(withDelay(820, withSequence(withTiming(0.001, { duration: 0 }), withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }))));
    const landing = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft), 860);
    return () => clearTimeout(landing);
  }, [runningId, hue, progress, flash, color]);

  return { progress, flash, color };
}

function IgnitionLayer({ frame, fromDeg, ignition }: { frame: DialFrame; fromDeg: number; ignition: Ignition }) {
  const { progress, flash, color } = ignition;
  const lap = arcPath(frame, fromDeg, 359.9);
  const tail = useDerivedValue(() => Math.max(0, progress.value - 0.3));
  const visible = useDerivedValue(() => (progress.value > 0 && progress.value < 1 ? 1 : 0));
  const head = useDerivedValue(() => polar(frame, fromDeg + progress.value * 360));
  const hx = useDerivedValue(() => head.value.x);
  const hy = useDerivedValue(() => head.value.y);
  const land = polar(frame, fromDeg);
  const flashR = useDerivedValue(() => frame.stroke * (0.8 + flash.value * 3.2));
  const flashOpacity = useDerivedValue(() => (flash.value > 0 && flash.value < 1 ? (1 - flash.value) * 0.9 : 0));
  const { stroke } = frame;

  return (
    <Group>
      <Group opacity={visible}>
        <Path path={lap} start={tail} end={progress} style="stroke" strokeWidth={stroke * 1.6} color={color} opacity={0.7} strokeCap="round">
          <BlurMask blur={stroke} style="normal" respectCTM />
        </Path>
        <Path path={lap} start={tail} end={progress} style="stroke" strokeWidth={stroke * 0.5} color={color} strokeCap="round" />
        <Circle cx={hx} cy={hy} r={stroke * 1.1} color={color}>
          <BlurMask blur={stroke * 0.8} style="normal" respectCTM />
        </Circle>
        <Circle cx={hx} cy={hy} r={stroke * 0.5} color="#FFFFFF" />
      </Group>
      <Circle cx={land.x} cy={land.y} r={flashR} color={color} opacity={flashOpacity}>
        <BlurMask blur={stroke * 0.7} style="normal" respectCTM />
      </Circle>
    </Group>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  corners: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  readout: { alignItems: 'center', maxWidth: 230 },
  name: { marginTop: 4, fontFamily: font.textBold, fontSize: 21, color: sky.text, letterSpacing: -0.3 },
  path: { marginTop: 2, fontFamily: font.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  clock: { fontFamily: font.display, fontSize: 44, letterSpacing: -1, marginVertical: 2, fontVariant: ['tabular-nums'] },
  hint: { marginTop: 6, fontFamily: font.text, fontSize: 12.5, lineHeight: 18, color: sky.faint, textAlign: 'center' },
  ago: { fontFamily: font.mono, fontSize: 13, color: sky.text, letterSpacing: 0.4 },
  trims: { marginTop: 4, fontFamily: font.mono, fontSize: 11, color: sky.dim, letterSpacing: 0.4 },
  stop: {
    marginTop: 12,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: alpha(sky.danger, 0.55),
    backgroundColor: alpha(sky.danger, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: sky.danger,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  stopSquare: { width: 14, height: 14, borderRadius: 3.5, backgroundColor: sky.danger },
});
