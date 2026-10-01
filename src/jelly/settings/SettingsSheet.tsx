// Settings as a native form under a candy header: the idea next to a mascot, squishy
// sounds, the Apple Intelligence status, Shortcuts links, export, restore and erasing.

import { Button, Section, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import { type Availability, availability, lastFailure } from '@modules/on-device-model';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  actions,
  eraseAllData,
  formatLongDay,
  pickBackup,
  resumeLink,
  shareExport,
  stopLink,
  useStint,
} from '@/core';

import { Character } from '../Character';
import { suggestForContext } from '../character/suggest';
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
          if (router.canGoBack()) router.back();
          router.navigate('/');
        },
      },
    ]);

  /** Picks an export file, checks it, and replaces everything after a confirmation. */
  const restore = async () => {
    const result = await pickBackup().catch((e: unknown) => ({ ok: false as const, reason: String(e) }));
    if (!result) return;
    if (!result.ok) {
      Alert.alert("Can't restore this file", result.reason);
      return;
    }
    const { backup } = result;
    const jellies = backup.contexts.filter((c) => c.deletedAt === null).length;
    const logged = backup.entries.filter((e) => e.deletedAt === null).length;
    const from = backup.exportedAt ? ` from ${formatLongDay(backup.exportedAt)}` : '';
    const replacing = contexts > 0 ? ' Everything on this iPhone now gets replaced.' : '';
    confirm('Restore this backup?', `The export${from} has ${jellies} jellies and ${logged} entries.${replacing}`, 'Restore', () =>
      actions.restore(backup),
    );
  };

  return (
    <JellyForm title="Settings" cancel={null} confirm={{ label: 'Done', onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title="Jelly">
        <Toggle label="Squishy sounds" systemImage="speaker.wave.2" isOn={sounds} onIsOnChange={setSounds} />
      </Section>
      <AppleIntelligence />
      <Section
        title="Shortcuts"
        footer={<SwiftText>Open these from the Shortcuts app, the Action Button or an automation. Each jelly has its own start link in its editor.</SwiftText>}>
        <Button label={copied === stopLink ? 'Copied Stop Link' : 'Copy Stop Link'} systemImage="stop.circle" onPress={() => copy(stopLink)} />
        <Button label={copied === resumeLink ? 'Copied Resume Link' : 'Copy Resume Link'} systemImage="play.circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title="Data" footer={<SwiftText>{`${contexts} jellies and ${entries} entries, stored on this iPhone.`}</SwiftText>}>
        <Button label="Export JSON" systemImage="square.and.arrow.up" onPress={() => shareExport().catch((e: unknown) => Alert.alert('Export failed', String(e)))} />
        <Button label="Restore from Export" systemImage="square.and.arrow.down" onPress={restore} />
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

const statusText: Record<Availability, string> = {
  available: 'Ready',
  appleIntelligenceNotEnabled: 'Off. Turn on Apple Intelligence in the Settings app.',
  modelNotReady: 'The model is still downloading. Try again later.',
  deviceNotEligible: 'Not supported on this iPhone.',
  unsupported: 'Needs iOS 26 or later.',
};

/**
 * The on-device model's status and a test request, so a silent fallback can be told apart
 * from a failing model. Failures show the reason from the native side.
 */
function AppleIntelligence() {
  const [state, setState] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    availability()
      .catch((): Availability => 'unsupported')
      .then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, []);

  const tryIt = async () => {
    setBusy(true);
    const started = Date.now();
    const suggestion = await suggestForContext({ name: 'Espresso run', ancestors: [], siblings: [], wantEmoji: true, wantHue: true });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    setBusy(false);
    setState(await availability().catch((): Availability => 'unsupported'));
    if (suggestion) {
      const { emoji, hue, topic, traits } = suggestion;
      const look = topic ? `the ${topic} look` : 'the look its name points at';
      const mood = traits.motion ? ` and a ${traits.motion} mood` : '';
      Alert.alert('It works', `"Espresso run" got ${emoji ?? 'no emoji'}, ${hue ?? 'no color'}, ${look}${mood}, in ${seconds} s.`);
    } else {
      Alert.alert('No suggestion', `${lastFailure() ?? 'The model gave no answer.'} (${seconds} s)`);
    }
  };

  return (
    <Section
      title="Apple Intelligence"
      footer={
        <SwiftText>
          {
            'While you name a new jelly, it suggests an emoji, a look and a mood, and a color for jellies at the top level. Existing jellies get dressed up in the background. It also writes the summary on the Week tab and reads what you type when picking a jelly, like "2h deep work this morning". Everything works without it.'
          }
        </SwiftText>
      }>
      <SwiftText>{state ? statusText[state] : 'Checking…'}</SwiftText>
      <Button label={busy ? 'Asking…' : 'Try a Suggestion'} systemImage="sparkles" onPress={tryIt} />
    </Section>
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
        <Text style={[text.title3, { color: t.c.ink }]}>Stint</Text>
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
