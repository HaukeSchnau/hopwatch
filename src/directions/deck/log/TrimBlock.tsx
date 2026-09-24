import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MINUTE, type Segment } from '@/core';

import { capColor, legendOn } from '../theme';
import { BlockLegend } from './BlockLegend';
import { PX_PER_MS } from './scale';

const SNAP = 5 * MINUTE;

interface TrimBlockProps {
  segment: Segment;
  dayStart: number;
  /** Latest time an edge may reach: now on today, else the end of the day. */
  limit: number;
  onSnap: (start: number, end: number) => void;
  onCommit: (edge: 'start' | 'end', at: number) => void;
}

/**
 * The block being trimmed, lifted above the tape with a grip on each draggable edge.
 * Edges snap to 5-minute marks with a tick; releasing commits through the domain,
 * which trims the neighbours.
 */
export function TrimBlock({ segment, dayStart, limit, onSnap, onCommit }: TrimBlockProps) {
  const { entry } = segment;
  const start = useSharedValue(segment.start);
  const end = useSharedValue(segment.end);
  const origin = useSharedValue(0);

  useEffect(() => {
    start.set(segment.start);
    end.set(segment.end);
  }, [segment.start, segment.end, start, end]);

  const blockStyle = useAnimatedStyle(() => ({
    top: (start.get() - dayStart) * PX_PER_MS,
    height: Math.max(6, (end.get() - start.get()) * PX_PER_MS),
  }));
  const topGrip = useAnimatedStyle(() => ({ top: (start.get() - dayStart) * PX_PER_MS - 22 }));
  const bottomGrip = useAnimatedStyle(() => ({ top: (end.get() - dayStart) * PX_PER_MS - 22 }));

  const startPan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      origin.set(start.get());
    })
    .onUpdate((e) => {
      const raw = origin.get() + e.translationY / PX_PER_MS;
      const snapped = Math.min(end.get() - SNAP, Math.max(dayStart, Math.round(raw / SNAP) * SNAP));
      if (snapped !== start.get()) {
        start.set(snapped);
        scheduleOnRN(onSnap, snapped, end.get());
      }
    })
    .onFinalize(() => {
      if (start.get() !== origin.get()) scheduleOnRN(onCommit, 'start', start.get());
    });

  const endPan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      origin.set(end.get());
    })
    .onUpdate((e) => {
      const raw = origin.get() + e.translationY / PX_PER_MS;
      const snapped = Math.max(start.get() + SNAP, Math.min(limit, Math.round(raw / SNAP) * SNAP));
      if (snapped !== end.get()) {
        end.set(snapped);
        scheduleOnRN(onSnap, start.get(), snapped);
      }
    })
    .onFinalize(() => {
      if (end.get() !== origin.get()) scheduleOnRN(onCommit, 'end', end.get());
    });

  const color = capColor[segment.context.hue];
  return (
    <>
      <Animated.View style={[styles.block, { backgroundColor: color }, blockStyle]} pointerEvents="none">
        <View style={styles.legend}>
          <BlockLegend context={segment.context} ink={legendOn(color)} height={999} />
        </View>
      </Animated.View>
      {segment.clippedStart ? null : (
        <GestureDetector gesture={startPan}>
          <Animated.View style={[styles.gripHit, topGrip]} accessibilityLabel="Drag start">
            <Grip />
          </Animated.View>
        </GestureDetector>
      )}
      {segment.clippedEnd || entry.endUtc === null ? null : (
        <GestureDetector gesture={endPan}>
          <Animated.View style={[styles.gripHit, bottomGrip]} accessibilityLabel="Drag end">
            <Grip />
          </Animated.View>
        </GestureDetector>
      )}
    </>
  );
}

function Grip() {
  return (
    <View style={styles.grip}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.ridge} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    left: -4,
    right: -4,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1C1B19',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  legend: { paddingTop: 11 },
  gripHit: { position: 'absolute', left: 0, right: 0, height: 44, alignItems: 'center', justifyContent: 'center' },
  grip: {
    width: 54,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1C1B19',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
    borderWidth: 1.5,
    borderColor: '#F4F1EA',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  ridge: { width: 20, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(244,241,234,0.75)' },
});
