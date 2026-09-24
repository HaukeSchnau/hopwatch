// The flying blobs of the switch choreography. Each flight hops along an arc with a
// little squash and stretch, waking up on the way in and yawning on the way out.

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { type ResolvedContext, useTree } from '@/core';

import { Character } from '../Character';
import { sleep, useFace, wake } from '../Gummy';
import { FLIGHT_MS, type Flight, isFlying, land, useAnchor, useChoreo, warmed } from './choreo';

/** Full-screen, touch-transparent layer that hosts the flights. */
export function FlyerLayer() {
  const ref = useAnchor('layer');
  const flights = useChoreo((s) => s.flights);
  const tree = useTree();
  return (
    <View ref={ref} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flights.map((f) => {
        const context = tree.byId.get(f.contextId);
        return context ? <Flyer key={f.key} flight={f} context={context} /> : null;
      })}
    </View>
  );
}

function Flyer({ flight, context }: { flight: Flight; context: ResolvedContext }) {
  const { from, to, kind } = flight;
  const size = Math.max(from.width, to.width, 1);
  const face = useFace(kind === 'in' ? 'asleep' : 'awake');
  const progress = useSharedValue(0);
  const go = useChoreo(isFlying);

  // Invisible for a few frames until the canvas has drawn, then report ready.
  useEffect(() => {
    let frame = 0;
    let handle = requestAnimationFrame(function tick() {
      if (++frame >= 3) warmed(flight);
      else handle = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(handle);
  }, [flight.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!go) return;
    if (kind === 'in') wake(face);
    else sleep(face);
    progress.set(
      withTiming(1, { duration: FLIGHT_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) }, (finished) => {
        if (finished) scheduleOnRN(land, flight);
      }),
    );
  }, [go]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => {
    const t = progress.get();
    const fx = from.x + from.width / 2;
    const fy = from.y + from.height / 2;
    const tx = to.x + to.width / 2;
    const ty = to.y + to.height / 2;
    const arc = kind === 'in' ? 110 : 70;
    const x = fx + (tx - fx) * t;
    const y = fy + (ty - fy) * t - arc * 4 * t * (1 - t);
    const width = from.width + (to.width - from.width) * t;
    const stretch = Math.sin(Math.PI * t) * 0.18;
    const spin = (kind === 'in' ? -1 : 1) * 16 * Math.sin(Math.PI * t);
    return {
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { scale: Math.max(0.001, width / size) },
        { rotate: `${spin}deg` },
        { scaleY: 1 + stretch },
        { scaleX: 1 - stretch * 0.55 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.flyer, { width: size, height: size, opacity: go ? 1 : 0 }, style]}>
      <Character context={context} size={size} face={face} shadow={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flyer: { position: 'absolute', left: 0, top: 0 },
});
