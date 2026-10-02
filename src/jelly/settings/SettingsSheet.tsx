// Settings as a native form under a candy header: the idea next to a mascot, squishy
// sounds, the Apple Intelligence status, Shortcuts links, export, restore and erasing.

import { Button, Section, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import { type Availability, availability } from '@modules/on-device-model';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { actions, eraseAllData, resumeLink, shareExport, stopLink, useStint } from '@/core';
import { settingsText } from '@/i18n/settings';

import { Character } from '../Character';
import { buzz, setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { text, useTheme } from '../theme';
import { chooseBackup } from './restore';

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

  /** Runs a change that replaces all data, then lands on Now. */
  const replace = (run: () => void) => {
    run();
    buzz.thud();
    if (router.canGoBack()) router.back();
    router.navigate('/');
  };

  const erase = () =>
    Alert.alert(data.eraseTitle, data.eraseMessage, [
      { text: settingsText.cancel, style: 'cancel' },
      { text: data.eraseConfirm, style: 'destructive', onPress: () => replace(eraseAllData) },
    ]);

  const restore = async () => {
    const backup = await chooseBackup(contexts > 0);
    if (backup) replace(() => actions.restore(backup));
  };

  return (
    <JellyForm title={settingsText.title} cancel={null} confirm={{ label: settingsText.done, onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title={settingsText.sound}>
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
          onPress={erase}
        />
      </Section>
    </JellyForm>
  );
}

/** Whether the on-device model is ready, and if not, what to do about it. */
function AppleIntelligence() {
  const [state, setState] = useState<Availability | null>(null);

  useEffect(() => {
    let live = true;
    availability()
      .catch((): Availability => 'unsupported')
      .then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Section title="Apple Intelligence" footer={<SwiftText>{intelligence.footer}</SwiftText>}>
      <SwiftText>{state ? intelligence.status[state] : intelligence.checking}</SwiftText>
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
        <Text style={[text.title3, { color: t.c.ink }]}>Hopwatch</Text>
        <Text style={[text.subhead, { color: t.c.ink, opacity: 0.75 }]}>{settingsText.idea}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  idea: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingLeft: 8, paddingRight: 16 },
  ideaText: { flex: 1, gap: 2 },
});
