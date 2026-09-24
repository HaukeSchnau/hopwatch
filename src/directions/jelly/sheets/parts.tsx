// Pieces shared by Jelly's sheets: the header with a character, the chunky "N min ago"
// chips and a friendly 24-hour time wheel.

import DateTimePicker from '@expo/ui/community/datetime-picker';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatClock, MINUTE, type ResolvedContext } from '@/core';

import { Character } from '../Character';
import { useFace, useLively } from '../Gummy';
import { candy, colors, fonts } from '../theme';
import { CandySurface, Squishy } from '../ui';

export function SheetHeader({
  context,
  title,
  subtitle,
  mood = 'awake',
}: {
  context: Pick<ResolvedContext, 'id' | 'hue' | 'glyph'> | null;
  title: string;
  subtitle?: ReactNode;
  mood?: 'awake' | 'asleep';
}) {
  const face = useFace(mood);
  useLively(face, mood === 'awake');
  return (
    <View style={styles.header}>
      {context && <Character context={context} size={72} face={face} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

/** Minutes offered by the backdating chips. */
export const AGO = [5, 10, 15, 30, 45] as const;

/** A row of chunky "N min ago" chips; each shows the clock time it lands on. */
export function AgoChips({
  hue,
  now,
  options,
  earliest,
  onPick,
}: {
  hue: ResolvedContext['hue'];
  now: number;
  options: readonly number[];
  /** Chips before this instant are disabled. */
  earliest?: number;
  onPick: (at: number) => void;
}) {
  const c = candy[hue];
  return (
    <View style={styles.chips}>
      {options.map((m) => {
        const at = now - m * MINUTE;
        const disabled = earliest !== undefined && at < earliest;
        return (
          <Squishy
            key={m}
            amount={0.16}
            disabled={disabled}
            onPress={() => onPick(at)}
            style={[styles.chipWrap, disabled && { opacity: 0.3 }]}
            accessibilityRole="button"
            accessibilityLabel={`${m} minutes ago, ${formatClock(at)}`}>
            <CandySurface hue={hue} radius={22} style={styles.chip}>
              <Text style={[styles.chipNumber, { color: c.on }]}>{m}</Text>
              <Text style={[styles.chipUnit, { color: c.on }]}>min ago</Text>
            </CandySurface>
            <Text style={styles.chipClock}>{formatClock(at)}</Text>
          </Squishy>
        );
      })}
    </View>
  );
}

/**
 * The most recent past instant at the picked wall-clock time: 23:30 picked at 00:10
 * means yesterday.
 */
export function pastAt(picked: Date, now: number): number {
  const d = new Date(now);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  const t = d.getTime();
  return t > now ? t - 24 * 60 * MINUTE : t;
}

export function TimeWheel({ value, onChange, hue }: { value: Date; onChange: (d: Date) => void; hue: ResolvedContext['hue'] }) {
  return (
    <View style={styles.wheel}>
      <DateTimePicker
        value={value}
        mode="time"
        display="spinner"
        locale="en_GB"
        themeVariant="light"
        accentColor={candy[hue].deep}
        onValueChange={(_, d) => onChange(d)}
        style={{ height: 132 }}
      />
    </View>
  );
}

export const sheetStyles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 26 },
  label: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  hint: { fontFamily: fonts.textBold, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 10 },
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 25, lineHeight: 29, color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.textBold, fontSize: 15, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  chipWrap: { alignItems: 'center', gap: 5 },
  chip: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  chipNumber: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 26 },
  chipUnit: { fontFamily: fonts.textHeavy, fontSize: 10, marginTop: -2, opacity: 0.9 },
  chipClock: { fontFamily: fonts.textBold, fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'] },
  wheel: { backgroundColor: colors.card, borderRadius: 24, overflow: 'hidden', alignItems: 'center' },
});
