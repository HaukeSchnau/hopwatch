import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Hue, hues } from '@/core';

import { Print } from './Body';
import { Key } from './Key';
import { Lcd } from './Lcd';
import { body, capColor, capNeutral, font, hueName, lcd, legendOn } from './theme';

interface NameFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  onBlur?: () => void;
}

/** A text entry that looks like the display: amber mono on black glass. */
export function NameField({ value, onChange, placeholder, autoFocus, onSubmit, onBlur }: NameFieldProps) {
  return (
    <Lcd style={styles.nameLcd} pixels={false} contentStyle={styles.nameContent}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={lcd.faint}
        selectionColor={lcd.ink}
        cursorColor={lcd.ink}
        keyboardAppearance="dark"
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        onBlur={onBlur}
        maxLength={40}
        allowFontScaling={false}
        style={styles.nameInput}
      />
    </Lcd>
  );
}

interface HuePickerProps {
  value: Hue | null;
  onChange: (hue: Hue | null) => void;
  /** Offer an AUTO key that inherits the parent's color, showing that color. */
  inherited?: Hue | null;
}

/** Twelve small color keys; the chosen one stays latched. */
export function HuePicker({ value, onChange, inherited }: HuePickerProps) {
  const rows = [hues.slice(0, 6), hues.slice(6)];
  return (
    <View style={styles.hueGrid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.hueRow}>
          {row.map((hue) => (
            <View key={hue} style={styles.hueCell}>
              <Key
                color={capColor[hue]}
                height={38}
                depth={5}
                radius={8}
                latched={value === hue}
                accessibilityLabel={hueName[hue]}
                onPress={() => onChange(hue)}
                capStyle={styles.center}>
                {value === hue ? <View style={[styles.hueDot, { backgroundColor: legendOn(capColor[hue]) }]} /> : null}
              </Key>
              <Print size={6} color={value === hue ? body.ink : body.ink3} style={styles.hueLabel} numberOfLines={1}>
                {hueName[hue]}
              </Print>
            </View>
          ))}
        </View>
      ))}
      {inherited !== undefined ? (
        <Key
          color={capNeutral}
          height={36}
          depth={5}
          radius={8}
          latched={value === null}
          onPress={() => onChange(null)}
          capStyle={styles.autoCap}>
          <View style={[styles.autoSwatch, { backgroundColor: inherited ? capColor[inherited] : body.ink3 }]} />
          <Print size={8.5} weight="bold" color={body.ink}>
            AUTO · INHERIT FROM PARENT
          </Print>
        </Key>
      ) : null}
    </View>
  );
}

const glyphs = [
  '💼', '🎧', '🗣️', '🤝', '🚀', '💻', '📧', '🧪', '⏱️', '🌱', '🏠', '🐕', '🍳', '🛒', '🥪', '☕️',
  '🏃', '🧘', '🚲', '📚', '✍️', '🎨', '🎸', '🎮', '👶', '🧹', '🔧', '🩺', '🚗', '✈️', '💤', '🎓',
];

const hints: [RegExp, string][] = [
  [/dog|walk|puppy/, '🐕'],
  [/lunch|food|eat|breakfast|dinner/, '🥪'],
  [/cook|kitchen/, '🍳'],
  [/meet|call|sync|standup/, '🗣️'],
  [/client|customer|freelanc/, '🤝'],
  [/mail|inbox/, '📧'],
  [/code|dev|program|build/, '💻'],
  [/deep|focus/, '🎧'],
  [/job|work|office/, '💼'],
  [/sport|gym|run|train|swim/, '🏃'],
  [/yoga|meditat/, '🧘'],
  [/bike|cycl|ride/, '🚲'],
  [/read|book/, '📚'],
  [/writ|blog|journal/, '✍️'],
  [/draw|paint|design|art/, '🎨'],
  [/music|guitar|piano|band/, '🎸'],
  [/game|play/, '🎮'],
  [/kid|baby|family|child/, '👶'],
  [/clean|house|chore|laundry/, '🧹'],
  [/shop|groceries|errand/, '🛒'],
  [/garden|plant/, '🌱'],
  [/study|learn|thesis|course|school|uni/, '🎓'],
  [/doctor|health|dentist/, '🩺'],
  [/commute|drive|car/, '🚗'],
  [/travel|trip|flight/, '✈️'],
  [/sleep|nap|rest/, '💤'],
  [/coffee|break/, '☕️'],
  [/side|project|hack/, '🧪'],
  [/home/, '🏠'],
];

/** A likely emoji for a context name, e.g. "Walk the dog" → 🐕. */
export function suggestGlyph(name: string): string | null {
  const lower = name.toLocaleLowerCase('en-GB');
  return hints.find(([pattern]) => pattern.test(lower))?.[1] ?? null;
}

interface GlyphPickerProps {
  value: string | null;
  onChange: (glyph: string | null) => void;
}

/** A row of emoji keys plus a field for any other emoji. Pressing the chosen key clears it. */
export function GlyphPicker({ value, onChange }: GlyphPickerProps) {
  const custom = value !== null && !glyphs.includes(value);
  return (
    <View style={styles.glyphs}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.glyphScroll} contentContainerStyle={styles.glyphRow} keyboardShouldPersistTaps="handled">
        {glyphs.map((g) => (
          <Key
            key={g}
            color={capNeutral}
            height={40}
            width={40}
            depth={5}
            radius={8}
            latched={value === g}
            onPress={() => onChange(value === g ? null : g)}
            capStyle={styles.center}>
            <Text allowFontScaling={false} style={styles.glyph}>
              {g}
            </Text>
          </Key>
        ))}
      </ScrollView>
      <View style={styles.customRow}>
        <Print size={8}>OR TYPE ONE</Print>
        <TextInput
          value={custom ? value : ''}
          onChangeText={(text) => {
            const trimmed = text.trim();
            onChange(trimmed ? trimmed : null);
          }}
          placeholder="🙂"
          maxLength={8}
          allowFontScaling={false}
          style={styles.customInput}
        />
        {value !== null ? (
          <Key color={capNeutral} height={30} depth={4} radius={7} onPress={() => onChange(null)} capStyle={styles.clearCap}>
            <Print size={8} weight="bold" color={body.ink}>
              NONE
            </Print>
          </Key>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nameLcd: { height: 62 },
  nameContent: { justifyContent: 'center', paddingHorizontal: 14 },
  nameInput: { fontFamily: font.monoBold, fontSize: 18, color: lcd.ink, letterSpacing: 0.5, paddingVertical: 8 },
  hueGrid: { gap: 10 },
  hueRow: { flexDirection: 'row', gap: 8 },
  hueCell: { flex: 1, gap: 5 },
  hueLabel: { textAlign: 'center' },
  hueDot: { width: 7, height: 7, borderRadius: 4 },
  center: { alignItems: 'center', justifyContent: 'center' },
  autoCap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  autoSwatch: { width: 12, height: 12, borderRadius: 3 },
  glyphs: { gap: 10 },
  glyphScroll: { marginHorizontal: -20 },
  glyphRow: { gap: 8, paddingHorizontal: 20, paddingVertical: 4 },
  glyph: { fontSize: 19 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customInput: {
    width: 64,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
    textAlign: 'center',
    fontSize: 19,
  },
  clearCap: { justifyContent: 'center', paddingHorizontal: 10 },
});
