// Jelly's time pickers on Android, with the same exports as time.tsx. Material has no
// wheel, so the time shows as candy digits that open Material's 24-hour dial.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatClock, type Hue } from '@/core';
import { sheetsText } from '@/i18n/sheets';

import { MaterialIcon, Pill, TimeDialog } from '../material';
import { alpha, rounded, tabular, useTheme } from '../theme';

export function TimeWheel({ value, onChange, hue }: { value: Date; onChange: (d: Date) => void; hue: Hue }) {
  const t = useTheme();
  const c = t.candy[hue];
  const [open, setOpen] = useState(false);
  const clock = formatClock(value.getTime());
  return (
    <Pressable
      onPress={() => setOpen(true)}
      android_ripple={{ color: alpha(c.fill, 0.25) }}
      accessibilityRole="button"
      accessibilityLabel={sheetsText.changeTime(clock)}
      style={[styles.wheel, { backgroundColor: t.c.card }]}>
      <MaterialIcon name="schedule" size={30} color={c.ink} />
      <Text style={[styles.digits, tabular, { color: c.ink }]}>{clock}</Text>
      {open ? <TimeDialog value={value} color={c.ink} onPick={onChange} onClose={() => setOpen(false)} /> : null}
    </Pressable>
  );
}

/** A time that opens Material's dial when tapped. */
export function TimeChip({ value, onChange, color }: { value: Date; onChange: (d: Date) => void; color: string }) {
  const [open, setOpen] = useState(false);
  const clock = formatClock(value.getTime());
  return (
    <View>
      <Pill label={clock} accessibilityLabel={sheetsText.changeTime(clock)} color={color} onPress={() => setOpen(true)} />
      {open ? <TimeDialog value={value} color={color} onPick={onChange} onClose={() => setOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wheel: { height: 104, borderRadius: 24, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  digits: { ...rounded('800'), fontSize: 52, letterSpacing: -1 },
});
