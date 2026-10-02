// Jelly's time pickers on iOS: the 24-hour wheel of the start and stop sheets and the
// compact time in the pick sheet and typed logging. Android: time.android.tsx.

import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { StyleSheet, View } from 'react-native';

import type { Hue } from '@/core';

import { useTheme } from '../theme';
import { pickerLocale } from './parts';

export function TimeWheel({ value, onChange, hue }: { value: Date; onChange: (d: Date) => void; hue: Hue }) {
  const t = useTheme();
  return (
    <View style={[styles.wheel, { backgroundColor: t.c.card }]}>
      <DateTimePicker
        value={value}
        mode="time"
        display="spinner"
        locale={pickerLocale}
        themeVariant={t.scheme}
        accentColor={t.candy[hue].ink}
        onValueChange={(_, d) => onChange(d)}
        style={{ height: 132 }}
      />
    </View>
  );
}

/** A time that opens the system's picker when tapped. */
export function TimeChip({ value, onChange, color }: { value: Date; onChange: (d: Date) => void; color: string }) {
  const t = useTheme();
  return (
    <DateTimePicker
      value={value}
      mode="time"
      display="compact"
      style={styles.chip}
      locale={pickerLocale}
      themeVariant={t.scheme}
      accentColor={color}
      onValueChange={(_, d) => onChange(d)}
    />
  );
}

const styles = StyleSheet.create({
  wheel: { borderRadius: 24, overflow: 'hidden', alignItems: 'center' },
  chip: { width: 92, height: 38 },
});
