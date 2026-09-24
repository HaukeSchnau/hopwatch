import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOutDown, SlideInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { actions, useUndoToast } from '@/core';

import { Print } from './Body';
import { success } from './feedback';
import { Key } from './Key';
import { Lcd, LcdText } from './Lcd';
import { body, lcd } from './theme';

const WINDOW = 5000;

/**
 * "SWITCHED TO DOG · UNDO": a small display strip with a draining countdown line and an
 * UNDO key, shown for a few seconds after every timeline change.
 */
export function UndoStrip({ bottom }: { bottom: number }) {
  const { action, visible } = useUndoToast(WINDOW);
  if (!action || !visible) return null;
  return (
    <Animated.View
      key={action.at}
      entering={SlideInDown.springify().damping(18).stiffness(260)}
      exiting={FadeOutDown.duration(160)}
      style={[styles.strip, { bottom }]}>
      <Lcd style={styles.lcd} pixels={false} contentStyle={styles.lcdContent}>
        <LcdText size={10.5} numberOfLines={1}>
          {action.label.toLocaleUpperCase('en-GB')}
        </LcdText>
        <Drain at={action.at} />
      </Lcd>
      <Key
        color={body.accent}
        height={50}
        width={88}
        heavy
        accessibilityLabel="Undo"
        onPress={() => {
          actions.undo();
          success();
        }}
        capStyle={styles.center}>
        <Print size={10} weight="bold" color="#FFFFFF" spacing={1.5}>
          UNDO
        </Print>
      </Key>
    </Animated.View>
  );
}

/** A line that drains over the rest of the undo window. */
function Drain({ at }: { at: number }) {
  const remaining = Math.max(0, at + WINDOW - Date.now());
  const progress = useSharedValue(remaining / WINDOW);
  useEffect(() => {
    progress.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
  }, [progress, remaining]);
  const style = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  return (
    <View style={styles.drainTrack}>
      <Animated.View style={[styles.drain, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    paddingBottom: 10,
    borderRadius: 22,
    backgroundColor: body.base,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.9)',
  },
  lcd: { flex: 1, height: 52 },
  lcdContent: { justifyContent: 'center', paddingHorizontal: 12, gap: 7 },
  drainTrack: { height: 2, backgroundColor: lcd.ghost },
  drain: { height: 2, backgroundColor: lcd.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
});
