// A small candy confetti burst. Each piece follows a ballistic arc from one progress
// value, so the whole burst is a single animation on the UI thread.

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { hues } from '@/core';

import { random } from '../geometry';
import { lightTheme } from '../theme';

interface Piece {
  vx: number;
  vy: number;
  spin: number;
  size: number;
  round: boolean;
  color: string;
}

function pieces(seed: number, count: number): Piece[] {
  const next = random(seed);
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (next() - 0.5) * Math.PI * 0.9;
    const speed = 160 + next() * 200;
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: (next() - 0.5) * 900,
      size: 6 + next() * 6,
      round: next() < 0.4,
      color: lightTheme.candy[hues[Math.floor(next() * (hues.length - 1))]].fill,
    };
  });
}

/** Bursts once each time `burst` changes to a new positive number. */
export function Confetti({ burst, count = 26 }: { burst: number; count?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (burst <= 0) return;
    progress.set(0);
    progress.set(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
  }, [burst, progress]);
  if (burst <= 0) return null;
  return (
    <View pointerEvents="none" style={styles.origin}>
      {pieces(burst, count).map((p, i) => (
        <Bit key={i} piece={p} progress={progress} />
      ))}
    </View>
  );
}

function Bit({ piece, progress }: { piece: Piece; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = progress.get() * 1.3;
    return {
      opacity: progress.get() < 0.75 ? 1 : 1 - (progress.get() - 0.75) * 4,
      transform: [
        { translateX: piece.vx * t },
        { translateY: piece.vy * t + 420 * t * t },
        { rotate: `${piece.spin * t}deg` },
        { scale: progress.get() === 0 ? 0 : 1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: piece.size, height: piece.round ? piece.size : piece.size * 0.5, borderRadius: piece.round ? piece.size / 2 : 2, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', left: '50%', top: '20%', width: 0, height: 0, overflow: 'visible' },
});
