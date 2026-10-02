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
import { locale } from '@/i18n';
import { settingsText } from '@/i18n/settings';

import { Character } from '../Character';
import { suggestForContext } from '../character/suggest';
import { buzz, setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { text, useTheme } from '../theme';

/** System red, so erasing never reads like the pink actions around it. */
const DANGER = '#FF3B30';
const { intelligence, shortcuts, data } = settingsText;

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
      { text: settingsText.cancel, style: 'cancel' },
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
      Alert.alert(data.cantRestore, result.reason);
      return;
    }
    const { backup } = result;
    const jellies = backup.contexts.filter((c) => c.deletedAt === null).length;
    const logged = backup.entries.filter((e) => e.deletedAt === null).length;
    const day = backup.exportedAt ? formatLongDay(backup.exportedAt) : null;
    confirm(data.restoreTitle, data.restoreMessage(day, jellies, logged, contexts > 0), data.restoreConfirm, () => actions.restore(backup));
  };

  return (
    <JellyForm title={settingsText.title} cancel={null} confirm={{ label: settingsText.done, onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title={settingsText.jelly}>
        <Toggle label={settingsText.sounds} systemImage="speaker.wave.2" isOn={sounds} onIsOnChange={setSounds} />
      </Section>
      <AppleIntelligence />
      <Section title={shortcuts.title} footer={<SwiftText>{shortcuts.footer}</SwiftText>}>
        <Button label={copied === stopLink ? shortcuts.copiedStop : shortcuts.copyStop} systemImage="stop.circle" onPress={() => copy(stopLink)} />
        <Button label={copied === resumeLink ? shortcuts.copiedResume : shortcuts.copyResume} systemImage="play.circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title={data.title} footer={<SwiftText>{data.footer(contexts, entries)}</SwiftText>}>
        <Button label={data.export} systemImage="square.and.arrow.up" onPress={() => shareExport().catch((e: unknown) => Alert.alert(data.exportFailed, String(e)))} />
        <Button label={data.restore} systemImage="square.and.arrow.down" onPress={restore} />
        <Button
          role="destructive"
          modifiers={[tint(DANGER), foregroundStyle(DANGER)]}
          label={data.erase}
          systemImage="trash"
          onPress={() => confirm(data.eraseTitle, data.eraseMessage, data.eraseConfirm, eraseAllData)}
        />
      </Section>
    </JellyForm>
  );
}

/** "1.2" or "1,2" seconds. */
const tenths = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
    const name = intelligence.sample;
    const suggestion = await suggestForContext({ name, ancestors: [], siblings: [], wantEmoji: true, wantHue: true });
    const seconds = tenths.format((Date.now() - started) / 1000);
    setBusy(false);
    setState(await availability().catch((): Availability => 'unsupported'));
    if (suggestion) {
      const { emoji, hue, topic, traits } = suggestion;
      Alert.alert(intelligence.worked, intelligence.got({ name, emoji, hue, topic, motion: traits.motion, seconds }));
    } else {
      Alert.alert(intelligence.none, `${lastFailure() ?? intelligence.noAnswer} (${seconds} s)`);
    }
  };

  return (
    <Section
      title="Apple Intelligence"
      footer={<SwiftText>{intelligence.footer}</SwiftText>}>
      <SwiftText>{state ? intelligence.status[state] : intelligence.checking}</SwiftText>
      <Button label={busy ? intelligence.asking : intelligence.try} systemImage="sparkles" onPress={tryIt} />
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
        <Text style={[text.subhead, { color: t.c.ink, opacity: 0.75 }]}>{settingsText.idea}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idea: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 8, paddingRight: 16 },
  ideaText: { flex: 1, gap: 2 },
});
