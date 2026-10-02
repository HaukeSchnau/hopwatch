// Jelly's forms, menus and pickers on Android: React Native layout in Jelly's colors, with
// Material 3 controls from @expo/ui/jetpack-compose where Android users expect them
// (switches, choice chips, dropdown menus, the date and time dialogs). Only `.android.tsx`
// files import this; iOS uses SwiftUI (forms.tsx, Menu.tsx).
//
// Compose views take touches natively. Ones that only show state (a row's switch, a menu's
// anchor) sit under `pointerEvents="none"` so the React Native row around them gets the tap.

import {
  Box,
  Column,
  DatePickerDialog,
  DropdownMenu,
  DropdownMenuItem,
  FilterChip,
  FlowRow,
  Host,
  Icon,
  Switch,
  Text as ComposeText,
  TimePickerDialog,
} from '@expo/ui/jetpack-compose';
import { fillMaxSize, fillMaxWidth, padding } from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { type AndroidSymbol, SymbolView, unstable_getMaterialSymbolSourceAsync } from 'expo-symbols';
import { createContext, type ReactElement, type ReactNode, use, useEffect, useState } from 'react';
import {
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatClock, formatDayMonth, formatWeekday } from '@/core';
import { sheetsText } from '@/i18n/sheets';

import type { JellyFormProps } from './forms';
import { alpha, tabular, text, type Theme, useTheme } from './theme';

/** The form's accent: the jelly's candy ink, or Jelly pink. Section titles and controls use it. */
const Accent = createContext<string | null>(null);

function useAccent(): string {
  const t = useTheme();
  return use(Accent) ?? t.c.pinkDeep;
}

/** Text and icons on the accent: the page color reads on candy ink in both appearances. */
const onAccent = (t: Theme) => t.c.bg;

/** The surface of menus and dialogs: a raised cream by day, a lighter plum at night. */
const raised = (t: Theme) => (t.dark ? t.plainCandy.fill : t.c.card);

const MARGIN = 16;

// Icons

/** A Material Symbol in React Native views. */
export function MaterialIcon({ name, size = 24, color }: { name: AndroidSymbol; size?: number; color: string }) {
  return <SymbolView name={{ android: name }} size={size} tintColor={color} />;
}

const images = new Map<AndroidSymbol, ImageSourcePropType | null>();
const loading = new Map<AndroidSymbol, Promise<void>>();

function loadImage(symbol: AndroidSymbol): Promise<void> {
  let pending = loading.get(symbol);
  if (!pending) {
    // Drawn black; Compose's Icon tints it with the surrounding content color.
    pending = unstable_getMaterialSymbolSourceAsync(symbol, 24, '#000000')
      .catch(() => null)
      .then((source) => {
        images.set(symbol, source);
      });
    loading.set(symbol, pending);
  }
  return pending;
}

/** Renders symbols ahead, so a menu's icons are there the first time it opens. */
export function preloadImages(symbols: readonly AndroidSymbol[]) {
  for (const symbol of symbols) loadImage(symbol);
}

// Compose only picks up an icon slot that's there on the first render, so the picker's check is drawn ahead.
preloadImages(['check']);

/** A Material Symbol as an image for Compose's Icon; null until it's drawn. */
export function useSymbolImage(symbol: AndroidSymbol | undefined): ImageSourcePropType | null {
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (!symbol || images.has(symbol)) return;
    let live = true;
    loadImage(symbol).then(() => live && setLoaded((n) => n + 1));
    return () => {
      live = false;
    };
  }, [symbol]);
  return symbol ? (images.get(symbol) ?? null) : null;
}

// Menus

/**
 * A Material dropdown menu that drops from the view it's rendered in, last among that
 * view's children. Its Compose host mounts on the first open and stays, so it can animate
 * closed.
 */
export function Dropdown({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const t = useTheme();
  const [used, setUsed] = useState(open);
  if (open && !used) setUsed(true);
  if (!used) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Host style={styles.fill} colorScheme={t.scheme} seedColor={t.c.pink}>
        <DropdownMenu expanded={open} onDismissRequest={onClose} color={raised(t)}>
          <DropdownMenu.Trigger>
            <Box modifiers={[fillMaxSize()]} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Items>{children}</DropdownMenu.Items>
        </DropdownMenu>
      </Host>
    </View>
  );
}

/** A heading inside a dropdown: the jelly's name, or a group like "Started earlier". */
export function MenuLabel({ label, strong }: { label: string; strong?: boolean }) {
  const t = useTheme();
  return (
    <ComposeText
      color={strong ? t.c.ink : t.c.muted}
      style={{ typography: strong ? 'titleSmall' : 'labelMedium' }}
      modifiers={[padding(12, strong ? 10 : 8, 12, 4)]}>
      {label}
    </ComposeText>
  );
}

interface MenuRowProps {
  title: string;
  /** A second line in smaller gray text, e.g. what picking it does. */
  subtitle?: string;
  icon?: AndroidSymbol;
  destructive?: boolean;
  /** Marks the current choice in a picker. */
  checked?: boolean;
  onPress: () => void;
}

export function MenuRow({ title, subtitle, icon, destructive, checked, onPress }: MenuRowProps) {
  const t = useTheme();
  const image = useSymbolImage(icon);
  const check = useSymbolImage(checked ? 'check' : undefined);
  const color = destructive ? t.c.danger : t.c.ink;
  return (
    <DropdownMenuItem onClick={onPress} elementColors={{ textColor: color, leadingIconColor: destructive ? t.c.danger : t.c.muted, trailingIconColor: t.c.ink }}>
      <DropdownMenuItem.Text>
        <Column>
          <ComposeText color={color} style={{ typography: 'bodyLarge' }}>
            {title}
          </ComposeText>
          {subtitle ? (
            <ComposeText color={t.c.muted} style={{ typography: 'bodyMedium' }}>
              {subtitle}
            </ComposeText>
          ) : null}
        </Column>
      </DropdownMenuItem.Text>
      {image ? (
        <DropdownMenuItem.LeadingIcon>
          <Icon source={image} size={24} />
        </DropdownMenuItem.LeadingIcon>
      ) : null}
      {check ? (
        <DropdownMenuItem.TrailingIcon>
          <Icon source={check} size={24} />
        </DropdownMenuItem.TrailingIcon>
      ) : null}
    </DropdownMenuItem>
  );
}

// The form frame

/**
 * A full-screen form: a top bar with close, title and the confirming action over a
 * scrolling page of sections. Same props as the SwiftUI JellyForm.
 */
export function JellyForm({ title, tint, cancel, confirm, children }: JellyFormProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const accent = tint ?? t.c.pinkDeep;
  const close = cancel ?? { label: sheetsText.close, onPress: () => router.back() };
  return (
    <Accent value={accent}>
      <View style={[styles.fill, { backgroundColor: t.c.bg }]}>
        <View style={styles.bar}>
          {cancel === null ? null : (
            <Pressable
              onPress={close.onPress}
              android_ripple={{ color: alpha(accent, 0.2), borderless: true, radius: 22 }}
              accessibilityRole="button"
              accessibilityLabel={close.label}
              style={styles.barIcon}>
              <MaterialIcon name="close" color={t.c.ink} />
            </Pressable>
          )}
          <Text style={[text.title3, styles.barTitle, { color: t.c.ink }, cancel === null && { marginLeft: MARGIN }]} numberOfLines={1}>
            {title}
          </Text>
          {confirm ? (
            <Pressable
              onPress={confirm.onPress}
              disabled={confirm.disabled}
              android_ripple={{ color: alpha(onAccent(t), 0.3) }}
              accessibilityRole="button"
              accessibilityState={{ disabled: confirm.disabled }}
              style={[styles.confirm, { backgroundColor: accent }, confirm.disabled && { opacity: 0.4 }]}>
              <Text style={[text.callout, { color: onAccent(t) }]}>{confirm.label}</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
          {children}
        </ScrollView>
      </View>
    </Accent>
  );
}

/**
 * A card for React Native content in a form, e.g. the candy header with a live jelly.
 * `render` gets the card's width.
 */
export function HostedRow({ color, render }: { color?: string; render: (width: number) => ReactElement }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  return <View style={[styles.card, styles.hosted, { backgroundColor: color ?? t.c.card }]}>{render(width - MARGIN * 2)}</View>;
}

// Sections and rows

export function Section({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const t = useTheme();
  const accent = useAccent();
  return (
    <View style={styles.section}>
      {title ? <Text style={[text.subhead, styles.sectionTitle, { color: accent }]}>{title}</Text> : null}
      <View style={[styles.card, { backgroundColor: t.c.card }]}>{children}</View>
      {footer ? <Text style={[text.footnote, styles.footer, { color: t.c.muted }]}>{footer}</Text> : null}
    </View>
  );
}

interface RowProps {
  label: string;
  /** A second line under the label. */
  detail?: string;
  icon?: AndroidSymbol;
  /** Shown at the end, e.g. a switch or the current value. */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  /** For switches: announced as a switch that's on or off. */
  checked?: boolean;
}

/** A list row: icon, label (and detail), and something at the end. Tappable with onPress. */
export function Row({ label, detail, icon, trailing, onPress, destructive, checked }: RowProps) {
  const t = useTheme();
  const accent = useAccent();
  const color = destructive ? t.c.danger : t.c.ink;
  const body = (
    <>
      {icon ? <MaterialIcon name={icon} color={destructive ? t.c.danger : accent} /> : null}
      <View style={styles.rowText}>
        <Text style={[text.body, { color }]}>{label}</Text>
        {detail ? <Text style={[text.subhead, styles.regular, { color: t.c.muted }]}>{detail}</Text> : null}
      </View>
      {trailing}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: alpha(accent, 0.14) }}
      accessibilityRole={checked === undefined ? 'button' : 'switch'}
      accessibilityState={checked === undefined ? undefined : { checked }}
      style={styles.row}>
      {body}
    </Pressable>
  );
}

/** A Material switch whose whole row toggles it. */
export function SwitchRow({ value, onChange, ...row }: Omit<RowProps, 'trailing' | 'onPress' | 'checked'> & { value: boolean; onChange: (on: boolean) => void }) {
  const t = useTheme();
  const accent = useAccent();
  return (
    <Row
      {...row}
      checked={value}
      onPress={() => onChange(!value)}
      trailing={
        <View pointerEvents="none">
          <Host matchContents colorScheme={t.scheme}>
            <Switch
              value={value}
              colors={{
                checkedTrackColor: accent,
                checkedBorderColor: accent,
                checkedThumbColor: onAccent(t),
                uncheckedTrackColor: t.c.sunken,
                uncheckedBorderColor: t.c.faint,
                uncheckedThumbColor: t.c.faint,
              }}
            />
          </Host>
        </View>
      }
    />
  );
}

export interface Choice<T> {
  value: T;
  label: string;
}

/** A row showing the current choice; tapping drops a menu of all choices under it. */
export function PickerRow<T extends string>({
  label,
  icon,
  choices,
  value,
  onChange,
}: {
  label: string;
  icon?: AndroidSymbol;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const current = choices.find((c) => c.value === value);
  return (
    <View>
      <Row
        label={label}
        icon={icon}
        onPress={() => setOpen(true)}
        trailing={
          <View style={styles.pickerValue}>
            <Text style={[text.body, styles.regular, styles.shrink, { color: t.c.muted }]} numberOfLines={1}>
              {current?.label}
            </Text>
            <MaterialIcon name="arrow_drop_down" color={t.c.muted} />
          </View>
        }
      />
      <Dropdown open={open} onClose={() => setOpen(false)}>
        {choices.map((c) => (
          <MenuRow
            key={c.value}
            title={c.label}
            checked={c.value === value}
            onPress={() => {
              setOpen(false);
              onChange(c.value);
            }}
          />
        ))}
      </Dropdown>
    </View>
  );
}

/** One-of-a-few choices as Material filter chips that wrap. */
export function ChoiceChips<T extends number>({ choices, value, onChange }: { choices: readonly Choice<T>[]; value: T; onChange: (value: T) => void }) {
  const t = useTheme();
  const accent = useAccent();
  return (
    <View style={styles.chips}>
      <Host matchContents={{ vertical: true }} colorScheme={t.scheme} style={styles.grow}>
        <FlowRow horizontalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
          {choices.map((c) => (
            <FilterChip
              key={c.value}
              selected={c.value === value}
              onClick={() => onChange(c.value)}
              border={{ width: 1, color: c.value === value ? accent : t.c.line }}
              colors={{
                containerColor: t.c.card,
                labelColor: t.c.ink,
                selectedContainerColor: accent,
                selectedLabelColor: onAccent(t),
              }}>
              <FilterChip.Label>
                <ComposeText style={{ typography: 'labelLarge' }}>{c.label}</ComposeText>
              </FilterChip.Label>
            </FilterChip>
          ))}
        </FlowRow>
      </Host>
    </View>
  );
}

/** A value with round minus and plus buttons, in place of iOS's stepper. */
export function StepperRow({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const t = useTheme();
  const accent = useAccent();
  const button = (icon: AndroidSymbol, next: number, a11y: string) => {
    const disabled = next < min || next > max;
    return (
      <Pressable
        onPress={() => onChange(next)}
        disabled={disabled}
        android_ripple={{ color: alpha(accent, 0.2), borderless: true, radius: 22 }}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={[styles.stepButton, { backgroundColor: t.c.sunken }, disabled && { opacity: 0.35 }]}>
        <MaterialIcon name={icon} color={accent} />
      </Pressable>
    );
  };
  return (
    <View style={styles.row}>
      <Text style={[text.body, tabular, styles.rowText, { color: t.c.ink }]}>{label}</Text>
      {button('remove', value - step, sheetsText.less)}
      {button('add', value + step, sheetsText.more)}
    </View>
  );
}

/** A text field filling a row. */
export function FieldRow(props: TextInputProps) {
  const t = useTheme();
  const accent = useAccent();
  return (
    <View style={styles.field}>
      <TextInput
        placeholderTextColor={t.c.faint}
        selectionColor={alpha(accent, 0.35)}
        cursorColor={accent}
        underlineColorAndroid="transparent"
        {...props}
        style={[text.body, styles.fieldInput, { color: t.c.ink }, props.style]}
      />
    </View>
  );
}

// Date and time

/** Material's time dialog with a 24-hour dial, in a palette seeded from `color`; it keeps the date of `value`. */
export function TimeDialog({ value, color, onPick, onClose }: { value: Date; color: string; onPick: (date: Date) => void; onClose: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.dialog} pointerEvents="none">
      <Host style={styles.fill} colorScheme={t.scheme} seedColor={color}>
        <TimePickerDialog
          initialDate={value.toISOString()}
          is24Hour
          onDateSelected={(picked) => {
            onClose();
            onPick(picked);
          }}
          onDismissRequest={onClose}
        />
      </Host>
    </View>
  );
}

/** Material's calendar dialog, in a palette seeded from `color`; it keeps the time of day of `value`. */
export function DateDialog({
  value,
  color,
  earliest,
  latest,
  onPick,
  onClose,
}: {
  value: Date;
  color: string;
  earliest?: Date;
  latest?: Date;
  onPick: (date: Date) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.dialog} pointerEvents="none">
      <Host style={styles.fill} colorScheme={t.scheme} seedColor={color}>
        <DatePickerDialog
          // The calendar works in UTC days: pass the local day as UTC midnight and read it back the same way.
          initialDate={new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString()}
          selectableDates={{ start: earliest, end: latest }}
          onDateSelected={(day) => {
            onClose();
            const next = new Date(value);
            next.setFullYear(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
            onPick(next);
          }}
          onDismissRequest={onClose}
        />
      </Host>
    </View>
  );
}

/** A small tappable value, like the time in "From 14:30". */
export function Pill({ label, accessibilityLabel, color, onPress }: { label: string; accessibilityLabel: string; color: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: alpha(color, 0.2) }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.pill, { backgroundColor: t.c.sunken }]}>
      <Text style={[text.headline, tabular, { color: t.c.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** A button inside a row, e.g. "Stop now": the accent on a soft well. */
export function TonalButton({ label, icon, onPress }: { label: string; icon?: AndroidSymbol; onPress: () => void }) {
  const t = useTheme();
  const accent = useAccent();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: alpha(accent, 0.2) }}
      accessibilityRole="button"
      style={[styles.pill, styles.tonal, { backgroundColor: t.c.sunken }]}>
      {icon ? <MaterialIcon name={icon} size={18} color={accent} /> : null}
      <Text style={[text.callout, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

/** A row with a day and a time to change, each in Material's dialog, like a calendar event. */
export function DateTimeRow({
  label,
  value,
  earliest,
  latest,
  onChange,
}: {
  label: string;
  value: number;
  earliest?: number;
  latest?: number;
  onChange: (at: number) => void;
}) {
  const accent = useAccent();
  const [dialog, setDialog] = useState<'date' | 'time' | null>(null);
  const close = () => setDialog(null);
  const day = `${formatWeekday(value)} ${formatDayMonth(value)}`;
  const clock = formatClock(value);
  const pick = (date: Date) => onChange(date.getTime());
  return (
    <Row
      label={label}
      trailing={
        <View style={styles.pills}>
          <Pill label={day} accessibilityLabel={sheetsText.changeDate(day)} color={accent} onPress={() => setDialog('date')} />
          <Pill label={clock} accessibilityLabel={sheetsText.changeTime(clock)} color={accent} onPress={() => setDialog('time')} />
          {dialog === 'date' ? (
            <DateDialog
              value={new Date(value)}
              color={accent}
              earliest={earliest === undefined ? undefined : new Date(earliest)}
              latest={latest === undefined ? undefined : new Date(latest)}
              onPick={pick}
              onClose={close}
            />
          ) : null}
          {dialog === 'time' ? <TimeDialog value={new Date(value)} color={accent} onPick={pick} onClose={close} /> : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  shrink: { flexShrink: 1 },
  regular: { fontWeight: '400' },
  bar: { flexDirection: 'row', alignItems: 'center', height: 64, paddingHorizontal: 8, gap: 8 },
  barIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1 },
  confirm: { height: 40, borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', marginRight: 8, overflow: 'hidden' },
  section: { marginTop: 20 },
  sectionTitle: { marginHorizontal: MARGIN * 2, marginBottom: 8 },
  card: { marginHorizontal: MARGIN, borderRadius: 24, overflow: 'hidden' },
  hosted: { marginTop: 8 },
  footer: { fontWeight: '400', marginHorizontal: MARGIN * 2, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 56, paddingHorizontal: MARGIN, paddingVertical: 8 },
  rowText: { flex: 1, gap: 2 },
  pickerValue: { flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: '60%' },
  chips: { paddingHorizontal: MARGIN, paddingVertical: 10 },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  field: { paddingHorizontal: MARGIN, minHeight: 56, justifyContent: 'center' },
  fieldInput: { paddingVertical: 12 },
  dialog: { position: 'absolute', width: 1, height: 1 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { height: 38, minWidth: 64, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  tonal: { flexDirection: 'row', gap: 6, borderRadius: 19 },
});
