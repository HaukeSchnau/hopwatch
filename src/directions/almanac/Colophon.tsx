// The Colophon: what the Almanac is printed with, and the press room: the Lab,
// export, sample data and erasing everything.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eraseAllData, hues, loadSampleData, resumeLink, shareExport, stopLink } from '@/core';

import { PageHeader } from './PageHeader';
import { Paper } from './Paper';
import { RisoDot } from './Riso';
import { font, ink, margin, riso } from './theme';
import { Caps, Rule } from './type';

export function Colophon() {
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState(false);

  const confirm = (title: string, message: string, action: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          run();
          router.dismissTo('/almanac');
        },
      },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 100, paddingHorizontal: margin }}>
        <PageHeader title="Colophon" folio="p. 5" />

        <Text style={styles.lede}>
          <Text style={styles.leadIn}>This edition</Text> of Stint treats your day as a small publication. Each
          morning the front page is set in type; the pen marks what you’re doing now; at the end of the week the
          figures are bound into a report. Gaps are left as white space, because not every hour needs a headline.
        </Text>

        <Text style={styles.body}>
          Set in <Text style={{ fontFamily: font.display, fontSize: 19 }}>Instrument Serif</Text>,{' '}
          <Text style={{ fontFamily: font.sansBold, fontSize: 14 }}>Inter Tight</Text> and{' '}
          <Text style={{ fontFamily: font.textItalic }}>Newsreader</Text>. Printed on warm stock in twelve risograph
          inks, never quite in register:
        </Text>
        <View style={styles.inks}>
          {hues.map((hue) => (
            <View key={hue} style={styles.ink}>
              <RisoDot hue={hue} size={14} />
              <Text style={styles.inkName} numberOfLines={1}>
                {riso[hue].name}
              </Text>
            </View>
          ))}
        </View>

        <Section title="The press room">
          <Row label="Change the design" note="Open the Lab" onPress={() => router.push('/lab')} />
          <Row
            label={exporting ? 'Preparing the export…' : 'Export everything'}
            note="JSON, through the share sheet"
            onPress={async () => {
              setExporting(true);
              try {
                await shareExport();
              } catch (error) {
                Alert.alert('Export failed', String(error));
              } finally {
                setExporting(false);
              }
            }}
          />
          <Row
            label="Load sample data"
            note="Three weeks of made-up days"
            onPress={() =>
              confirm(
                'Load sample data?',
                'This replaces every context and entry on this phone with three weeks of sample days.',
                'Replace with samples',
                loadSampleData,
              )
            }
          />
          <Row
            label="Erase all data"
            note="Start again from a blank page"
            danger
            onPress={() =>
              confirm(
                'Erase all data?',
                'Every context and entry on this phone will be deleted. Export first if you want a copy.',
                'Erase everything',
                eraseAllData,
              )
            }
          />
        </Section>

        <Section title="Shortcut links">
          <Text style={styles.small}>
            Open these from the Shortcuts app, Siri or the Action Button. Each context’s own start link is in its
            entry in the Index.
          </Text>
          <LinkRow label="Stop the clock" link={stopLink} />
          <LinkRow label="Back to the previous context" link={resumeLink} />
        </Section>

        <Rule style={{ marginTop: 36 }} />
        <Text style={styles.imprint}>Printed on an iPhone · Almanac edition · Vol. I</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Caps color={ink.full}>{title}</Caps>
      </View>
      {children}
    </View>
  );
}

function Row({ label, note, onPress, danger }: { label: string; note: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(28,26,23,0.06)' }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, danger && { color: ink.red }]}>{label}</Text>
        <Text style={styles.rowNote}>{note}</Text>
      </View>
      <Text style={[styles.rowArrow, danger && { color: ink.red }]}>→</Text>
    </Pressable>
  );
}

function LinkRow({ label, link }: { label: string; link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy link: ${label}`}
      onPress={async () => {
        await Clipboard.setStringAsync(link);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: 'rgba(28,26,23,0.06)' }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.linkText}>{link}</Text>
      </View>
      <Caps color={ink.full}>{copied ? 'Copied ✓' : 'Copy'}</Caps>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lede: { marginTop: 20, fontFamily: font.text, fontSize: 19, lineHeight: 28, color: ink.full },
  leadIn: { fontFamily: font.sansBold, fontSize: 14, letterSpacing: 1.6, textTransform: 'uppercase', color: ink.red },
  body: { marginTop: 16, fontFamily: font.text, fontSize: 17, lineHeight: 25, color: ink.full },
  inks: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  ink: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  inkName: { flexShrink: 1, fontFamily: font.textItalic, fontSize: 16, color: ink.soft },
  section: { marginTop: 34 },
  sectionHead: { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: ink.full },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ink.rule,
  },
  rowLabel: { fontFamily: font.display, fontSize: 25, lineHeight: 29, color: ink.full },
  rowNote: { fontFamily: font.textItalic, fontSize: 14.5, color: ink.soft },
  rowArrow: { fontFamily: font.display, fontSize: 26, color: ink.full },
  small: { marginTop: 10, marginBottom: 4, fontFamily: font.textItalic, fontSize: 15, lineHeight: 21, color: ink.soft },
  linkText: { marginTop: 2, fontFamily: font.sansRegular, fontSize: 12, color: ink.soft },
  imprint: { marginTop: 10, textAlign: 'center', fontFamily: font.textItalic, fontSize: 13.5, color: ink.faint },
});
