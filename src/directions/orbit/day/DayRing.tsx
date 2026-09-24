import { BlurMask, Circle, Group, Path } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { actions, type DayReport, type EntryId, formatClock, formatDuration, type GapSegment, type Segment } from '@/core';

import { Dial, type DialArc } from '../Dial';
import { arcPath, type DialFrame, pointDeg, pointRadius, polar, SNAP, snap, timeAtDeg, timeToDeg } from '../geometry';
import { alpha, font, neon, sky } from '../theme';
import { Label } from '../ui';

/** An arc end that can be dragged. At a joint the end of one entry meets the start of the next. */
interface Handle {
  time: number;
  deg: number;
  /** The entry whose end sits here, if it can move. */
  endOf: Segment | null;
  /** The entry whose start sits here, if it can move. */
  startOf: Segment | null;
}

/** A drag in progress: which edge of which entry, and where it is now. */
interface Drag {
  segment: Segment;
  edge: 'start' | 'end';
  time: number;
}

interface DayRingProps {
  frame: DialFrame;
  report: DayReport;
  now: number;
  onTapEntry: (id: EntryId) => void;
  onTapGap: (gap: GapSegment, at: number) => void;
  onSwipe: (direction: -1 | 1) => void;
}

const GRAB = 24;
const MIN_LEN = SNAP;

/**
 * The day's ring on the Day screen. Drag an arc's end along the ring to move a start or
 * end (snapped to 5 minutes; neighbours get trimmed), tap an arc for its detail, tap a
 * dark gap to fill it, swipe sideways for another day.
 */
export function DayRing({ frame, report, now, onTapEntry, onTapGap, onSwipe }: DayRingProps) {
  const { start: dayStart, end: dayEnd } = report;
  const live = now < dayEnd;
  const [drag, setDrag] = useState<Drag | null>(null);
  /** The touch in progress: the grabbed arc end (if any) and the last raw time under the finger. */
  const gesture = useRef<{ handle: Handle | null; mode: 'none' | 'drag' | 'swipe'; time: number }>({
    handle: null,
    mode: 'none',
    time: 0,
  });

  const handles = buildHandles(report.segments, dayStart, dayEnd);
  const deg = (ts: number) => timeToDeg(ts, dayStart, dayEnd);

  const arcs: DialArc[] = report.segments.map((s) => {
    const dragged = drag?.segment.entry.id === s.entry.id;
    return {
      key: s.entry.id,
      start: dragged && drag.edge === 'start' ? drag.time : s.start,
      end: dragged && drag.edge === 'end' ? drag.time : s.running ? Math.max(now, s.start) : s.end,
      color: neon[s.context.hue],
      running: s.running,
      faded: drag !== null && !dragged,
    };
  });

  const nearest = (x: number, y: number): Handle | null => {
    const radius = pointRadius(frame, x, y);
    if (Math.abs(radius - frame.r) > GRAB + frame.stroke / 2) return null;
    const at = pointDeg(frame, x, y);
    let best: Handle | null = null;
    let bestDist = GRAB;
    for (const h of handles) {
      const d = Math.abs(((at - h.deg + 540) % 360) - 180);
      const dist = (d * Math.PI * frame.r) / 180;
      if (dist < bestDist) {
        best = h;
        bestDist = dist;
      }
    }
    return best;
  };

  const timeAt = (x: number, y: number, near: number) => timeAtDeg(pointDeg(frame, x, y), dayStart, dayEnd, near, dayStart, dayEnd);

  // The gesture reads and writes the drag through a ref; state only drives rendering.
  const dragRef = useRef<Drag | null>(null);
  const setDragBoth = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const moveDrag = (x: number, y: number) => {
    const g = gesture.current;
    if (!g.handle) return;
    const raw = timeAt(x, y, g.time);
    g.time = raw;
    // At a joint the direction decides: later extends the earlier entry, earlier extends the later one.
    let current = dragRef.current;
    if (!current) {
      const later = raw > g.handle.time;
      const segment = (later ? g.handle.endOf : g.handle.startOf) ?? g.handle.endOf ?? g.handle.startOf;
      if (!segment) return;
      current = { segment, edge: segment === g.handle.endOf ? 'end' : 'start', time: g.handle.time };
    }
    const { segment, edge } = current;
    const time =
      edge === 'start'
        ? Math.max(dayStart, Math.min(snap(raw), (segment.running ? now : segment.end) - MIN_LEN))
        : Math.min(dayEnd, now, Math.max(snap(raw), segment.start + MIN_LEN));
    if (current !== dragRef.current || time !== current.time) {
      if (time !== current.time) Haptics.selectionAsync();
      setDragBoth({ segment, edge, time });
    }
  };

  const endDrag = () => {
    const g = gesture.current;
    g.handle = null;
    g.mode = 'none';
    const done = dragRef.current;
    if (!done) return;
    setDragBoth(null);
    const { segment, edge, time } = done;
    const original = edge === 'start' ? segment.entry.startUtc : segment.entry.endUtc;
    if (original === time) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // The domain trims or removes whatever the new edge runs into.
    actions.updateEntry(
      segment.entry.id,
      edge === 'start' ? { startUtc: time } : { endUtc: time },
      `${segment.context.name} ${edge === 'start' ? 'starts' : 'ends'} ${formatClock(time)}`,
    );
  };

  // The pan decides at touch-down: near an arc end it drags that end, anywhere else a
  // sideways swipe changes the day. Without movement the tap below takes over.
  const pan = Gesture.Pan()
    .minDistance(4)
    .runOnJS(true)
    .onBegin((e) => {
      const handle = nearest(e.x, e.y);
      gesture.current = { handle, mode: handle ? 'drag' : 'swipe', time: handle?.time ?? 0 };
    })
    .onStart(() => {
      if (gesture.current.mode === 'drag') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((e) => {
      if (gesture.current.mode === 'drag') moveDrag(e.x, e.y);
    })
    .onEnd((e) => {
      const { mode } = gesture.current;
      if (mode === 'swipe' && Math.abs(e.translationX) > 50 && Math.abs(e.translationX) > Math.abs(e.translationY)) {
        onSwipe(e.translationX < 0 ? 1 : -1);
      }
    })
    .onFinalize(() => endDrag());

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      const radius = pointRadius(frame, e.x, e.y);
      if (Math.abs(radius - frame.r) > frame.stroke / 2 + 22) return;
      const at = timeAt(e.x, e.y, (dayStart + Math.min(dayEnd, now)) / 2);
      const hit = report.segments.find((s) => s.start <= at && at < s.end);
      if (hit) {
        Haptics.selectionAsync();
        onTapEntry(hit.entry.id);
        return;
      }
      const gap = report.gaps.find((g) => g.start <= at && at < g.end);
      if (gap) {
        Haptics.selectionAsync();
        onTapGap(gap, at);
      }
    });

  const composed = Gesture.Exclusive(pan, tap);
  const f = report.fragmentation;

  return (
    <GestureDetector gesture={composed}>
      <View style={{ width: frame.size, height: frame.size }}>
        <Dial frame={frame} dayStart={dayStart} dayEnd={dayEnd} arcs={arcs} now={live ? now : null}>
          {!drag && <HandleDots frame={frame} handles={handles} />}
          {drag && <DragKnob frame={frame} deg={deg(drag.time)} color={neon[drag.segment.context.hue]} />}
        </Dial>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          {drag ? (
            <>
              <Label style={{ color: neon[drag.segment.context.hue] }}>
                {drag.segment.context.name} {drag.edge === 'start' ? 'starts' : 'ends'}
              </Label>
              <Text style={[styles.big, { color: neon[drag.segment.context.hue] }]}>{formatClock(drag.time)}</Text>
              <Text style={styles.sub}>
                {formatDuration(
                  (drag.edge === 'end' ? drag.time : drag.segment.entry.endUtc ?? now) -
                    (drag.edge === 'start' ? drag.time : drag.segment.entry.startUtc),
                )}{' '}
                long
              </Text>
            </>
          ) : (
            <>
              <Label>tracked</Label>
              <Text style={styles.big}>{formatDuration(report.totals.total)}</Text>
              <Text style={styles.sub}>
                {f.blocks} {f.blocks === 1 ? 'block' : 'blocks'}
                {f.blocks > 0 ? ` · median ${formatDuration(f.median)}` : ''}
              </Text>
              {f.blocks > 0 && <Text style={styles.hint}>{'Drag an arc end to move it.\nTap a dark gap to fill it.'}</Text>}
            </>
          )}
        </View>
      </View>
    </GestureDetector>
  );
}

function buildHandles(segments: readonly Segment[], dayStart: number, dayEnd: number): Handle[] {
  const byTime = new Map<number, Handle>();
  const at = (time: number) => {
    let h = byTime.get(time);
    if (!h) {
      h = { time, deg: timeToDeg(time, dayStart, dayEnd), endOf: null, startOf: null };
      byTime.set(time, h);
    }
    return h;
  };
  for (const s of segments) {
    if (!s.clippedStart) at(s.start).startOf = s;
    if (!s.clippedEnd && !s.running) at(s.end).endOf = s;
  }
  return [...byTime.values()];
}

/** Tiny grips at every draggable arc end. */
function HandleDots({ frame, handles }: { frame: DialFrame; handles: Handle[] }) {
  return (
    <Group>
      {handles.map((h) => {
        const p = polar(frame, h.deg, frame.r + frame.stroke / 2 + 4);
        return <Circle key={h.time} cx={p.x} cy={p.y} r={1.6} color={sky.dim} />;
      })}
    </Group>
  );
}

function DragKnob({ frame, deg, color }: { frame: DialFrame; deg: number; color: string }) {
  const p = polar(frame, deg);
  const guide = arcPath(frame, deg - 0.4, 0.8, frame.r);
  return (
    <Group>
      <Path path={guide} style="stroke" strokeWidth={frame.stroke + 16} color={color} opacity={0.35}>
        <BlurMask blur={8} style="normal" respectCTM />
      </Path>
      <Circle cx={p.x} cy={p.y} r={frame.stroke * 0.95} color={color} opacity={0.5}>
        <BlurMask blur={frame.stroke * 0.8} style="normal" respectCTM />
      </Circle>
      <Circle cx={p.x} cy={p.y} r={frame.stroke * 0.7} color="#FFFFFF" />
      <Circle cx={p.x} cy={p.y} r={frame.stroke * 0.7} color={color} style="stroke" strokeWidth={3} />
      <Circle cx={p.x} cy={p.y} r={2} color={alpha(color, 1)} />
    </Group>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: font.display, fontSize: 38, color: sky.text, letterSpacing: -1, marginVertical: 2, fontVariant: ['tabular-nums'] },
  sub: { fontFamily: font.mono, fontSize: 11.5, color: sky.dim, letterSpacing: 0.4 },
  hint: { marginTop: 12, fontFamily: font.text, fontSize: 11.5, lineHeight: 16, color: sky.faint, textAlign: 'center' },
});
