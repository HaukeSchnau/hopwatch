// Seven round chips, Monday first, for the work days of a job-hours target. Both
// platforms' jelly editors use it; one day always stays on.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Hue, isWorkday } from '@/core';
import { locale } from '@/i18n';

import { buzz } from '../feedback';
import { text, useTheme } from '../theme';

// 1 January 2024 was a Monday.
const weekday = (i: number, style: 'short' | 'long') => new Intl.DateTimeFormat(locale, { weekday: style }).format(new Date(2024, 0, 1 + i));
const days = Array.from({ length: 7 }, (_, i) => ({ short: weekday(i, 'short').slice(0, 2), long: weekday(i, 'long') }));

export function WeekdayChips({ value, onChange, hue, width }: { value: number; onChange: (workDays: number) => void; hue: Hue; width?: number }) {
  const t = useTheme();
  const c = t.candy[hue];
  return (
    <View style={[styles.row, width !== undefined && { width }]}>
      {days.map((day, i) => {
        const on = isWorkday(value, i);
        return (
          <Pressable
            key={day.long}
            onPress={() => {
              const next = value ^ (1 << i);
              if (next === 0) return buzz.warn();
              buzz.tick();
              onChange(next);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={day.long}
            style={[styles.chip, { backgroundColor: on ? c.fill : t.c.sunken }]}>
            <Text style={[text.footnote, styles.label, { color: on ? c.on : t.c.muted }]}>{day.short}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12 },
  chip: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700' },
});
