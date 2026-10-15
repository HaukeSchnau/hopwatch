// The day-off pill on Android: a tonal pill that drops a Material menu. Logic and choices:
// dayOff.ts.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Dropdown, MenuRow } from '../material';
import { text, useTheme } from '../theme';
import { dayOffChoices, useDayOffPill } from './dayOff';

export function DayOffPill({ dayStart }: { dayStart: number }) {
  const t = useTheme();
  const pill = useDayOffPill(dayStart);
  const [open, setOpen] = useState(false);
  if (!pill.shown) return null;
  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[styles.pill, { backgroundColor: pill.off ? t.candy.pink.tint : t.c.sunken }]}>
        <Text style={[text.footnote, styles.label, { color: pill.off ? t.c.pinkDeep : t.c.muted }]}>{pill.label}</Text>
      </Pressable>
      <Dropdown open={open} onClose={() => setOpen(false)}>
        {dayOffChoices(pill.kind).map((choice) => (
          <MenuRow
            key={choice.kind ?? 'workday'}
            title={choice.title}
            checked={choice.kind !== null && choice.kind === pill.kind}
            onPress={() => {
              setOpen(false);
              pill.set(choice.kind);
            }}
          />
        ))}
      </Dropdown>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  label: { fontWeight: '700' },
});
