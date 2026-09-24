import { MenuView } from '@expo/ui/community/menu';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { actions, formatDuration, type ResolvedContext, useNow } from '@/core';

import { onStartMenu, startMenu } from '../backdate';
import { Glass } from '../Glass';
import { Glyph } from '../Glyph';
import { numeric, useTheme } from '../theme';

interface TileProps {
  context: ResolvedContext;
  size: number;
  /** Start of the running entry when this tile is the one running. */
  runningSince: number | null;
}

/**
 * A Control Center-style tile. Tapping switches to it: its color blooms out from the
 * finger while the previously running tile fades back to glass, and the emoji pops.
 * Long-press opens the backdate menu.
 */
export function Tile({ context, size, runningSince }: TileProps) {
  const theme = useTheme();
  const hue = theme.hue(context.hue);
  const running = runningSince !== null;

  // `grow` scales the bloom circle, `fill` fades it; they part ways when a tile stops.
  const grow = useSharedValue(running ? 1 : 0);
  const fill = useSharedValue(running ? 1 : 0);
  const pop = useSharedValue(1);
  const originX = useSharedValue(size / 2);
  const originY = useSharedValue(size / 2);
  const bloomSize = size * 2.9;

  useEffect(() => {
    if (running) {
      if (fill.get() > 0.99) return;
      fill.set(1);
      grow.set(0);
      grow.set(withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
      pop.set(withSequence(withTiming(1.32, { duration: 130 }), withSpring(1, { damping: 7, stiffness: 240 })));
    } else {
      fill.set(withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }));
    }
  }, [running, fill, grow, pop]);

  const bloomStyle = useAnimatedStyle(() => ({
    opacity: fill.value,
    left: originX.value - bloomSize / 2,
    top: originY.value - bloomSize / 2,
    transform: [{ scale: grow.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: fill.value * grow.value }));
  const emojiStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const nameStyle = useAnimatedStyle(() => ({
    color: interpolateColor(fill.value, [0, 1], [theme.label, hue.onSolid]),
  }));

  return (
    <MenuView
      shouldOpenOnLongPress
      title={context.name}
      actions={startMenu()}
      onPressAction={({ nativeEvent }) => onStartMenu(context.id, nativeEvent.event)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={running ? `${context.name}, running` : context.name}
        accessibilityHint="Switches to this context. Long-press to start it earlier."
        onPressIn={(e) => {
          originX.set(e.nativeEvent.locationX);
          originY.set(e.nativeEvent.locationY);
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.start(context.id);
        }}
        style={({ pressed }) => [{ width: size, height: size }, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
        <Animated.View
          style={[styles.glow, { borderRadius: size * 0.28, backgroundColor: hue.solid, shadowColor: hue.solid }, glowStyle]}
        />
        <Glass interactive style={[styles.tile, { borderRadius: size * 0.28 }]}>
          <View style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: size * 0.28 }]} pointerEvents="none">
            <Animated.View
              style={[{ position: 'absolute', width: bloomSize, height: bloomSize, borderRadius: bloomSize / 2, backgroundColor: hue.solid }, bloomStyle]}
            />
          </View>
          <Animated.View style={emojiStyle}>
            <Glyph context={context} size={28} />
          </Animated.View>
          <Animated.Text style={[styles.name, nameStyle]} numberOfLines={running ? 1 : 2} adjustsFontSizeToFit minimumFontScale={0.85}>
            {context.name}
          </Animated.Text>
          {running ? <TileDuration since={runningSince} color={hue.onSolid} /> : null}
        </Glass>
      </Pressable>
    </MenuView>
  );
}

function TileDuration({ since, color }: { since: number; color: string }) {
  const now = useNow(15_000);
  return <Animated.Text style={[numeric, styles.duration, { color }]}>{formatDuration(now - since)}</Animated.Text>;
}

const styles = StyleSheet.create({
  glow: {
    ...StyleSheet.absoluteFill,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 3 },
  clip: { overflow: 'hidden' },
  name: { fontSize: 12, fontWeight: '600', textAlign: 'center', letterSpacing: -0.1 },
  duration: { fontSize: 12, fontWeight: '600', opacity: 0.85, marginTop: -2 },
});
