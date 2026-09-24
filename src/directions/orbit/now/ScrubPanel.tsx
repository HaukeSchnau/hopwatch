import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { addDays, formatClock, MINUTE, type ResolvedContext, useNow } from '@/core';

import { alpha, font, neon, sky } from '../theme';
import { TimeField } from '../TimeField';
import { IconButton, Squish } from '../ui';
import { type Scrub, START_REACH } from './scrub';

const CHIPS = [5, 10, 15, 30, 60];

interface ScrubPanelProps {
  scrub: Scrub;
  /** The context being started, for `start`. */
  context: ResolvedContext | null;
  /** Start of the running entry, the earliest possible stop. */
  runningSince: number | null;
  onChange: (at: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Takes the place of the Back pill while backdating: quick "N min ago" chips, an exact
 * time picker, and the confirm button.
 */
export function ScrubPanel({ scrub, context, runningSince, onChange, onCancel, onConfirm }: ScrubPanelProps) {
  const now = useNow(5000);
  const color = scrub.kind === 'start' && context ? neon[context.hue] : sky.danger;
  const min = scrub.kind === 'stop' ? (runningSince ?? now) : now - START_REACH;
  const minutesAgo = Math.round((now - scrub.at) / MINUTE);
  const title =
    scrub.kind === 'start'
      ? `Start ${context?.name ?? ''} ${minutesAgo === 0 ? 'now' : `at ${formatClock(scrub.at)}`}`
      : `Stop ${minutesAgo === 0 ? 'now' : `at ${formatClock(scrub.at)}`}`;

  const pickTime = (picked: number) => {
    let at = picked;
    if (at > now) at = addDays(at, -1);
    Haptics.selectionAsync();
    onChange(Math.max(min, Math.min(now, at)));
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.panel}>
      <View style={styles.confirmRow}>
        <IconButton name="xmark" onPress={onCancel} accessibilityLabel="Cancel" style={styles.cancel} color={sky.text} />
        <Squish
          onPress={onConfirm}
          scaleTo={0.97}
          accessibilityRole="button"
          style={[styles.confirm, { backgroundColor: color, shadowColor: color }]}>
          <SymbolView name={scrub.kind === 'start' ? 'play.fill' : 'stop.fill'} size={15} tintColor={sky.bg} />
          <Text style={styles.confirmText} numberOfLines={1}>
            {title}
          </Text>
        </Squish>
      </View>
      <View style={styles.chips}>
        {CHIPS.map((m) => {
          const at = now - m * MINUTE;
          const disabled = at < min;
          // Within a minute counts, so the chip stays lit while the clock moves on.
          const active = Math.abs(now - scrub.at - m * MINUTE) < MINUTE;
          return (
            <Squish
              key={m}
              disabled={disabled}
              onPress={() => onChange(at)}
              scaleTo={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${m} minutes ago`}
              style={[
                styles.chip,
                active && { borderColor: color, backgroundColor: alpha(color, 0.16) },
                disabled && { opacity: 0.3 },
              ]}>
              <Text style={[styles.chipText, active && { color: sky.text }]}>−{m}</Text>
            </Squish>
          );
        })}
        <View style={styles.picker}>
          <TimeField value={scrub.at} onChange={pickTime} color={color} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 20, gap: 12 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancel: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: sky.hairlineHi,
    backgroundColor: 'rgba(20,24,36,0.8)',
  },
  confirm: {
    flex: 1,
    height: 66,
    borderRadius: 33,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    shadowOpacity: 0.7,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  confirmText: { fontFamily: font.textBold, fontSize: 17, color: sky.bg, letterSpacing: -0.3, flexShrink: 1 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: sky.hairlineHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: font.mono, fontSize: 13, color: sky.dim },
  picker: { marginLeft: 4 },
});
