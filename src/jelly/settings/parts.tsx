// What both platforms' Settings share: the candy header with the mascot, and the actions
// behind the rows (copying links, export, restore, erase, opening the website's pages).

import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { actions, eraseAllData, shareExport, useHopwatch } from '@/core';
import { settingsText } from '@/i18n/settings';

import { Character } from '../Character';
import { buzz } from '../feedback';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { text, useTheme } from '../theme';
import { chooseBackup } from './restore';

const { data } = settingsText;

export function useSettingsActions() {
  const contexts = useHopwatch((s) => s.contexts.length);
  const entries = useHopwatch((s) => s.entries.length);
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
    Alert.alert(
      data.eraseTitle,
      data.eraseMessage,
      [
        { text: settingsText.cancel, style: 'cancel' },
        { text: data.eraseConfirm, style: 'destructive', onPress: () => replace(eraseAllData) },
      ],
      // Android: Back and tapping outside close it, like any dialog there.
      { cancelable: true },
    );

  const restore = async () => {
    const backup = await chooseBackup(contexts > 0);
    if (backup) replace(() => actions.restore(backup));
  };

  const exportData = () => shareExport().catch((e: unknown) => Alert.alert(data.exportFailed, String(e)));

  return { contexts, entries, copied, copy, erase, restore, exportData };
}

/** Opens a page of the website, e.g. the privacy policy, in the browser. */
export const openPage = (url: string) => Linking.openURL(url).catch(() => {});

const mascot: PreviewJelly = { id: 'settings-mascot', hue: 'pink', glyph: '🍬', name: 'Jelly' };

/** The candy header: a mascot and the idea in two lines. */
export function Idea({ width }: { width: number }) {
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
