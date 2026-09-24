import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type Hue, loadSampleData } from '@/core';

import { Body, Print } from '../Body';
import { CapLegend } from '../CapLegend';
import { keyDown, success, warning } from '../feedback';
import { GlyphPicker, HuePicker, NameField, suggestGlyph } from '../fields';
import { DeviceHeader } from '../Header';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Led } from '../Led';
import { Section } from '../Section';
import { body, capColor, lcd } from '../theme';

/**
 * First run: no grid yet, just "program your first key". Name, color and glyph show
 * up live on a preview keycap; PRINT KEY creates the context pinned to slot 01.
 */
export function Onboarding() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [hue, setHue] = useState<Hue>('blue');
  // Until a glyph is picked, one is suggested from the name.
  const [picked, setPicked] = useState<{ glyph: string | null } | null>(null);
  const glyph = picked ? picked.glyph : suggestGlyph(name);
  const ready = name.trim().length > 0;

  const create = () => {
    if (!ready) {
      warning();
      return;
    }
    actions.createContext({ name, color: hue, emoji: glyph, pinned: true });
    success();
  };

  return (
    <Body>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 28 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <DeviceHeader mode="FIRST RUN" />
        <View style={styles.lcdWrap}>
          <Lcd style={styles.lcd} contentStyle={styles.lcdContent}>
            <LcdText size={9} color={lcd.dim}>
              ST-5 · NO KEYS PROGRAMMED
            </LcdText>
            <LcdText dot size={40} color={lcd.hot} style={styles.hello}>
              HELLO.
            </LcdText>
            <LcdText size={10.5} style={styles.lcdBody}>
              PROGRAM YOUR FIRST KEY. WHAT DO YOU SPEND TIME ON? A JOB, A CLIENT, THE DOG…
            </LcdText>
          </Lcd>
        </View>
        <View style={styles.form}>
          <Section label="01 · NAME" />
          <NameField value={name} onChange={setName} placeholder="Job" onSubmit={create} />
          <Section label="02 · COLOR" style={styles.gap} />
          <HuePicker value={hue} onChange={(h) => h && setHue(h)} />
          <Section label="03 · GLYPH" style={styles.gap} />
          <GlyphPicker value={glyph} onChange={(g) => setPicked({ glyph: g })} />
          <Section label="04 · PRINT" style={styles.gap} />
          <View style={styles.printRow}>
            <View style={styles.preview}>
              <View style={styles.previewHead}>
                <Print size={7} color={body.ink3}>
                  01
                </Print>
                <Led on={ready} size={6} />
              </View>
              <Key color={capColor[hue]} height={84} capStyle={styles.previewCap} onPress={() => keyDown()}>
                <CapLegend name={ready ? name.trim() : 'Your key'} glyph={glyph} hue={hue} size="large" />
              </Key>
            </View>
            <Key color={body.accent} height={84} heavy style={styles.printKey} onPress={create} capStyle={styles.printCap}>
              <Print size={8} weight="bold" color="rgba(255,255,255,0.85)">
                PRINT
              </Print>
              <Print size={14} weight="bold" color="#FFFFFF" spacing={1}>
                KEY 01
              </Print>
            </Key>
          </View>
          <Pressable onPress={loadSampleData} style={styles.sample} accessibilityRole="button" hitSlop={10}>
            <Print size={8.5} color={body.ink2}>
              OR LOAD SAMPLE DATA TO LOOK AROUND
            </Print>
          </Pressable>
        </View>
      </ScrollView>
    </Body>
  );
}

const styles = StyleSheet.create({
  lcdWrap: { paddingHorizontal: 12, marginTop: 2 },
  lcd: { height: 176 },
  lcdContent: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'space-between' },
  hello: { lineHeight: 46, marginTop: 6 },
  lcdBody: { lineHeight: 17 },
  form: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  gap: { marginTop: 10 },
  printRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-end' },
  preview: { flex: 1, gap: 5 },
  previewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  previewCap: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 11 },
  printKey: { flex: 1 },
  printCap: { justifyContent: 'center', alignItems: 'center', gap: 6 },
  sample: { alignSelf: 'center', marginTop: 18, paddingVertical: 8 },
});
