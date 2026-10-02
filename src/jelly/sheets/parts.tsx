// Pieces shared by Jelly's time sheets: the header with a character and the chunky
// "N min ago" chips. The time pickers are in time.tsx.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatClock, type Hue, MINUTE, type ResolvedContext } from '@/core';
import { locale } from '@/i18n';
import { sheetsText } from '@/i18n/sheets';

import { Character } from '../Character';
import { useFace, useLively } from '../Gummy';
import { tabular, text, useTheme } from '../theme';
import { CandySurface, Squishy } from '../ui';

export function SheetHeader({
  context,
  title,
  subtitle,
  mood = 'awake',
}: {
  context: ResolvedContext | null;
  title: string;
  subtitle?: ReactNode;
  mood?: 'awake' | 'asleep';
}) {
  const t = useTheme();
  const face = useFace(mood);
  useLively(face, mood === 'awake');
  return (
    <View style={styles.header}>
      {context && <Character context={context} size={72} face={face} />}
      <View style={{ flex: 1 }}>
        <Text style={[text.title2, { color: t.c.ink }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={[text.subhead, styles.subtitle, { color: t.c.muted }]}>{subtitle}</Text> : null}
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
  hue: Hue;
  now: number;
  options: readonly number[];
  /** Chips before this instant are disabled. */
  earliest?: number;
  onPick: (at: number) => void;
}) {
  const t = useTheme();
  const c = t.candy[hue];
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
            accessibilityLabel={sheetsText.agoLabel(m, formatClock(at))}>
            <CandySurface hue={hue} radius={22} style={styles.chip}>
              <Text style={[styles.chipNumber, { color: c.on }]}>{m}</Text>
              <Text style={[text.caption, styles.chipUnit, { color: c.on }]}>{sheetsText.agoUnit}</Text>
            </CandySurface>
            <Text style={[text.caption, tabular, { color: t.c.muted }]}>{formatClock(at)}</Text>
          </Squishy>
        );
      })}
    </View>
  );
}

/** For native date and time pickers: the app's language with a 24-hour clock, as "de_DE". */
export const pickerLocale = locale.replace('-', '_');

/**
 * The most recent past instant at the picked wall-clock time: 23:30 picked at 00:10
 * means yesterday.
 */
export function pastAt(picked: Date, now: number): number {
  const d = new Date(now);
  d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  const at = d.getTime();
  return at > now ? at - 24 * 60 * MINUTE : at;
}

/** Styles shared by the RN sheets. */
export function useSheetStyles() {
  const t = useTheme();
  return {
    label: [text.headline, styles.label, { color: t.c.ink }],
    hint: [text.footnote, styles.hint, { color: t.c.muted }],
  };
}

export const sheetBody = { paddingHorizontal: 20, paddingTop: 26 } as const;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subtitle: { marginTop: 2 },
  label: { marginTop: 22, marginBottom: 10 },
  hint: { textAlign: 'center', marginTop: 10 },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  chipWrap: { alignItems: 'center', gap: 5 },
  chip: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  chipNumber: { fontFamily: 'ui-rounded', fontWeight: '800', fontSize: 24, lineHeight: 26 },
  chipUnit: { fontSize: 10, marginTop: -2, opacity: 0.9 },
});
