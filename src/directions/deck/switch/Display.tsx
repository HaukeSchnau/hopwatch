import { type ReactNode, useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type EntryExitAnimationFunction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  addDays,
  durationParts,
  formatClock,
  formatDuration,
  MINUTE,
  type ResolvedContext,
  startOfDay,
  useDayReport,
  useEntries,
  useNow,
  useRunning,
  useTree,
} from '@/core';

import { Lcd, LcdText } from '../Lcd';
import { lcd, screenColor } from '../theme';
import { type Program, programTarget } from './program';

const pad = (n: number) => String(n).padStart(2, '0');
const upper = (s: string) => s.toLocaleUpperCase('en-GB');

const weekdayDate = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/**
 * The main LCD of the SWITCH mode: the running context and its live timer, the idle
 * state, or, while the knob is out, the rewind being dialled in.
 */
export function Display({ program, minutes, exact }: { program: Program | null; minutes: number; exact: number | null }) {
  const running = useRunning();
  return (
    <Lcd style={styles.lcd} contentStyle={styles.content}>
      {program ? (
        <ProgramView program={program} minutes={minutes} exact={exact} />
      ) : running ? (
        <RunningView context={running.context} since={running.entry.startUtc} />
      ) : (
        <IdleView />
      )}
    </Lcd>
  );
}

function RunningView({ context, since }: { context: ResolvedContext; since: number }) {
  return (
    <>
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <BlinkDot />
          <LcdText size={9} color={lcd.dim}>
            REC
          </LcdText>
        </View>
        <Clock />
      </View>
      <ContextLine key={context.id} context={context} />
      <LiveTimer since={since} />
      <View style={styles.info}>
        <LcdText size={10}>SINCE {formatClock(since)}</LcdText>
        <TodayTotal />
      </View>
      <DayBar />
    </>
  );
}

function IdleView() {
  const entries = useEntries();
  const tree = useTree();
  const last = entries.at(-1);
  const lastContext = last && tree.byId.get(last.contextId);
  return (
    <>
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <View style={[styles.square, { backgroundColor: lcd.dim }]} />
          <LcdText size={9} color={lcd.dim}>
            IDLE
          </LcdText>
        </View>
        <Clock />
      </View>
      <View style={styles.contextLine}>
        <LcdText dot size={24} numberOfLines={1}>
          READY
        </LcdText>
      </View>
      <View style={styles.timer}>
        <LcdText dot size={76} color={lcd.faint} glow={false} style={styles.bigDigits}>
          0:00
        </LcdText>
      </View>
      <View style={styles.info}>
        <LcdText size={10} numberOfLines={1} style={{ flex: 1 }}>
          {lastContext && last?.endUtc
            ? `LAST ${upper(lastContext.name)} · ${formatClock(last.endUtc)}`
            : 'PRESS A KEY TO START'}
        </LcdText>
        <TodayTotal />
      </View>
      <DayBar />
    </>
  );
}

function ProgramView({ program, minutes, exact }: { program: Program; minutes: number; exact: number | null }) {
  const running = useRunning();
  const tree = useTree();
  const now = useNow(5_000);
  const target = programTarget(program, tree, running);
  const at = exact ?? now - minutes * MINUTE;
  const verb = program.kind === 'stop' ? 'STOP' : program.kind === 'back' ? 'BACK TO' : 'START';
  const big = exact !== null ? formatClock(exact) : minutes === 0 ? 'NOW' : minutes < 60 ? `−${minutes}` : `−${formatDuration(minutes * MINUTE)}`;
  const unit = exact !== null ? 'SET' : minutes === 0 ? '' : minutes < 60 ? 'MIN' : 'H:MM';

  let note = '';
  if (program.kind === 'stop' && running) note = `LOGS ${formatDuration(Math.max(0, at - running.entry.startUtc))}`;
  else if (running && target && running.context.id === target.id) note = 'MOVES START';
  else if (running) note = `${upper(running.context.name)} ENDS`;

  return (
    <>
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <Rewind />
          <LcdText size={9} color={lcd.dim}>
            REWIND · {verb}
          </LcdText>
        </View>
        <LcdText size={9} color={lcd.dim}>
          5 MIN DETENTS
        </LcdText>
      </View>
      {target ? <ContextLine key={target.id} context={target} /> : <View style={styles.contextLine} />}
      <View style={styles.timer}>
        <LcdText dot size={76} color={lcd.hot} style={styles.bigDigits}>
          {big}
        </LcdText>
        {unit ? (
          <LcdText dot size={24} style={styles.unit}>
            {unit}
          </LcdText>
        ) : null}
      </View>
      <View style={styles.info}>
        <LcdText size={10}>AT {formatClock(Math.min(at, now))}</LcdText>
        <LcdText size={10} color={lcd.dim} numberOfLines={1} style={styles.infoRight}>
          {note}
        </LcdText>
      </View>
      <DayBar highlightFrom={Math.min(at, now)} />
    </>
  );
}

// Text entering from the right in pixel steps, like a display refreshing.
const scrollIn: EntryExitAnimationFunction = () => {
  'worklet';
  return {
    initialValues: { transform: [{ translateX: 90 }], opacity: 0 },
    animations: {
      transform: [{ translateX: withTiming(0, { duration: 260, easing: Easing.steps(9, true) }) }],
      opacity: withTiming(1, { duration: 60 }),
    },
  };
};

/** Color pixel plus "PARENT › NAME", scrolling like a marquee when it doesn't fit. */
function ContextLine({ context }: { context: ResolvedContext }) {
  const parents = context.ancestors.map((a) => upper(a.name)).join(' › ');
  return (
    <Animated.View entering={scrollIn} style={styles.contextLine}>
      <View style={[styles.swatch, { backgroundColor: screenColor[context.hue], shadowColor: screenColor[context.hue] }]} />
      <Marquee>
        {parents ? (
          <LcdText dot size={24} color={lcd.dim} glow={false}>
            {parents} ›{' '}
          </LcdText>
        ) : null}
        <LcdText dot size={24}>
          {upper(context.name)}
        </LcdText>
      </Marquee>
    </Animated.View>
  );
}

/** Scrolls its single line of children back and forth when it overflows. */
function Marquee({ children }: { children: ReactNode }) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const offset = useSharedValue(0);
  const overflow = Math.max(0, textWidth - boxWidth);

  useEffect(() => {
    if (overflow <= 0) {
      offset.set(0);
      return;
    }
    const travel = overflow * 22;
    offset.set(
      withRepeat(
        withSequence(
          withDelay(1400, withTiming(-overflow, { duration: travel, easing: Easing.linear })),
          withDelay(1400, withTiming(0, { duration: travel * 0.4, easing: Easing.inOut(Easing.quad) })),
        ),
        -1,
      ),
    );
  }, [overflow, offset]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  // The track is far wider than any name, so the text is measured at its natural width.
  return (
    <View style={styles.marqueeBox} onLayout={(e: LayoutChangeEvent) => setBoxWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.marqueeTrack, style]}>
        <View style={styles.marqueeRow} onLayout={(e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width)}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

/** H:MM in big dots with the seconds as a small flourish. The only per-second render. */
function LiveTimer({ since }: { since: number }) {
  const now = useNow(500);
  const { hours, minutes, seconds } = durationParts(now - since);
  return (
    <View style={styles.timer}>
      <LcdText dot size={76} color={lcd.hot} style={styles.bigDigits}>
        {hours}:{pad(minutes)}
      </LcdText>
      <LcdText dot size={30} style={styles.seconds}>
        :{pad(seconds)}
      </LcdText>
    </View>
  );
}

function Clock() {
  const now = useNow(10_000);
  return (
    <LcdText size={9} color={lcd.dim}>
      {upper(weekdayDate.format(now))} · {formatClock(now)}
    </LcdText>
  );
}

function TodayTotal() {
  const now = useNow(60_000);
  const report = useDayReport(startOfDay(now));
  return (
    <LcdText size={10} color={lcd.dim} style={styles.infoRight}>
      TODAY {formatDuration(report.totals.total)}
    </LcdText>
  );
}

/**
 * Today from midnight to midnight as a strip of lit blocks, with a now marker. While
 * rewinding, the stretch that the rewind will cover is hatched.
 */
export function DayBar({ highlightFrom = null }: { highlightFrom?: number | null }) {
  const now = useNow(30_000);
  const dayStart = startOfDay(now);
  const span = addDays(dayStart, 1) - dayStart;
  const report = useDayReport(dayStart);
  const pct = (t: number) => `${(Math.max(0, Math.min(span, t - dayStart)) / span) * 100}%` as const;

  return (
    <View style={styles.dayBar}>
      <View style={styles.track}>
        {[3, 6, 9, 12, 15, 18, 21].map((h) => (
          <View key={h} style={[styles.hourTick, { left: `${(h / 24) * 100}%` }]} />
        ))}
        {report.segments.map((s) => (
          <View
            key={s.entry.id}
            style={[
              styles.segment,
              {
                left: pct(s.start),
                width: `${(Math.max(span * 0.004, s.end - s.start) / span) * 100}%`,
                backgroundColor: screenColor[s.context.hue],
              },
            ]}
          />
        ))}
        {highlightFrom !== null && (
          <View style={[styles.rewind, { left: pct(highlightFrom), right: `${100 - (Math.min(span, now - dayStart) / span) * 100}%` }]} />
        )}
        <View style={[styles.now, { left: pct(now) }]} />
      </View>
      <View style={styles.hours}>
        {['00', '06', '12', '18', '24'].map((h) => (
          <LcdText key={h} size={7} color={lcd.faint} glow={false}>
            {h}
          </LcdText>
        ))}
      </View>
    </View>
  );
}

function BlinkDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withRepeat(withSequence(withTiming(1, { duration: 0 }), withDelay(600, withTiming(0.15, { duration: 0 })), withDelay(400, withTiming(1, { duration: 0 }))), -1));
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.recDot, style]} />;
}

/** Two left-pointing triangles, the rewind symbol. */
function Rewind() {
  return (
    <View style={styles.rewindIcon}>
      <View style={styles.tri} />
      <View style={styles.tri} />
    </View>
  );
}

const styles = StyleSheet.create({
  lcd: { height: 206 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  status: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 14 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B1F', shadowColor: '#FF3B1F', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  square: { width: 7, height: 7 },
  contextLine: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 28, marginTop: 5, overflow: 'hidden' },
  swatch: { width: 10, height: 10, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  marqueeBox: { flex: 1, overflow: 'hidden' },
  marqueeTrack: { width: 3000 },
  marqueeRow: { flexDirection: 'row', alignSelf: 'flex-start' },
  timer: { flexDirection: 'row', alignItems: 'flex-end', height: 78 },
  bigDigits: { lineHeight: 80 },
  seconds: { lineHeight: 34, marginBottom: 10, marginLeft: 2 },
  unit: { lineHeight: 30, marginBottom: 12, marginLeft: 12 },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, gap: 12 },
  infoRight: { textAlign: 'right' },
  dayBar: { marginTop: 8 },
  track: { height: 9, backgroundColor: 'rgba(255,165,72,0.06)', overflow: 'hidden' },
  hourTick: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: lcd.line },
  segment: { position: 'absolute', top: 1, bottom: 1, opacity: 0.92 },
  rewind: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,214,163,0.35)', borderLeftWidth: 1, borderLeftColor: lcd.hot },
  now: { position: 'absolute', top: -2, bottom: -2, width: 1.5, backgroundColor: lcd.hot },
  hours: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  rewindIcon: { flexDirection: 'row' },
  tri: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: lcd.ink,
  },
});
