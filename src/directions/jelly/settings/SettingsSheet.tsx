// Settings as a native form under a candy header: the idea next to a mascot, the Lab,
// squishy sounds, Shortcuts links, export, sample data and erasing.

import { Button, Section, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { eraseAllData, loadSampleData, resumeLink, shareExport, stopLink, useStint } from '@/core';

import { Character } from '../Character';
import { buzz, setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { text, useTheme } from '../theme';

/** System red, so erasing never reads like the pink actions around it. */
const DANGER = '#FF3B30';

export function SettingsSheet() {
  const t = useTheme();
  const sounds = useSounds();
  const contexts = useStint((s) => s.contexts.length);
  const entries = useStint((s) => s.entries.length);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (link: string) => {
    Clipboard.setStringAsync(link);
    buzz.success();
    setCopied(link);
  };

  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: 'destructive',
        onPress: () => {
          run();
          buzz.thud();
          router.back();
          router.navigate('/jelly');
        },
      },
    ]);

  return (
    <JellyForm title="Settings" cancel={null} confirm={{ label: 'Done', onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title="Jelly">
        <Button
          label="Open the Lab"
          systemImage="flask"
          onPress={() => {
            router.back();
            router.push('/lab');
          }}
        />
        <Toggle label="Squishy sounds" systemImage="speaker.wave.2" isOn={sounds} onIsOnChange={setSounds} />
      </Section>
      <Section
        title="Shortcuts"
        footer={<SwiftText>Open these from the Shortcuts app, the Action Button or an automation. Each jelly has its own start link in its editor.</SwiftText>}>
        <Button label={copied === stopLink ? 'Copied Stop Link' : 'Copy Stop Link'} systemImage="stop.circle" onPress={() => copy(stopLink)} />
        <Button label={copied === resumeLink ? 'Copied Resume Link' : 'Copy Resume Link'} systemImage="play.circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title="Data" footer={<SwiftText>{`${contexts} jellies and ${entries} entries, stored on this iPhone.`}</SwiftText>}>
        <Button label="Export JSON" systemImage="square.and.arrow.up" onPress={() => shareExport().catch((e: unknown) => Alert.alert('Export failed', String(e)))} />
        <Button
          label="Load Sample Data"
          systemImage="wand.and.stars"
          onPress={() => confirm('Replace everything with sample data?', `This deletes your ${contexts} jellies and all entries.`, 'Load Sample', loadSampleData)}
        />
        <Button
          role="destructive"
          modifiers={[tint(DANGER), foregroundStyle(DANGER)]}
          label="Erase All Data"
          systemImage="trash"
          onPress={() => confirm('Erase all data?', 'Every jelly and every entry goes. Export first if you want a backup.', 'Erase', eraseAllData)}
        />
      </Section>
    </JellyForm>
  );
}

const mascot: PreviewJelly = { id: 'settings-mascot', hue: 'pink', glyph: '🍬', name: 'Jelly' };

/** The candy header: a mascot and the idea in two lines. */
function Idea({ width }: { width: number }) {
  const t = useTheme();
  const face = useFace('awake');
  useLively(face, true);
  return (
    <View style={[styles.idea, { width }]}>
      <Character context={mascot} size={84} face={face} />
      <View style={styles.ideaText}>
        <Text style={[text.title3, { color: t.c.ink }]}>Jelly</Text>
        <Text style={[text.subhead, { color: t.c.ink, opacity: 0.75 }]}>
          {"Every context is a gummy with a face. The one you're on wakes up in the dial; the rest nap in their slots until you tap them."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idea: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 8, paddingRight: 16 },
  ideaText: { flex: 1, gap: 2 },
});
