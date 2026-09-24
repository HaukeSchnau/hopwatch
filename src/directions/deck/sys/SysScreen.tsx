import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eraseAllData, loadSampleData, resumeLink, shareExport, stopLink, useEntries, useTree } from '@/core';

import { Body, Print } from '../Body';
import { setSound, success, useDeckPrefs, warning } from '../feedback';
import { DeviceHeader } from '../Header';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Led } from '../Led';
import { Section } from '../Section';
import { body, capDark, capNeutral, lcd } from '../theme';

/** SYS: the Lab, export, sounds, sample data, erase, shortcut links and what Deck is. */
export function SysScreen() {
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const entries = useEntries();
  const sound = useDeckPrefs((p) => p.sound);

  const confirmReplace = (title: string, message: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Replace',
        style: 'destructive',
        onPress: () => {
          run();
          warning();
          router.navigate('/deck');
        },
      },
    ]);

  return (
    <Body>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <DeviceHeader mode="SYS" />
        <ScrollView contentContainerStyle={styles.content}>
          <Lcd style={styles.about} contentStyle={styles.aboutContent}>
            <LcdText size={8.5} color={lcd.dim}>
              ST-5 TIME DEVICE · FW {Constants.expoConfig?.version ?? '0.1'}
            </LcdText>
            <LcdText dot size={26} color={lcd.hot} style={styles.aboutTitle}>
              DECK
            </LcdText>
            <LcdText size={10} style={styles.aboutBody}>
              A POCKET INSTRUMENT FOR YOUR DAY. PRESS A KEY TO SWITCH, TURN THE KNOB TO DIAL TIME BACK.
            </LcdText>
            <LcdText size={8.5} color={lcd.dim}>
              {tree.ordered.length} CONTEXTS · {entries.length} ENTRIES
            </LcdText>
          </Lcd>

          <Section label="DEVICE" />
          <Row
            label="SWITCH THE DESIGN"
            detail="Open the Lab and pick another of the five directions."
            keyLabel="LAB"
            onPress={() => router.push('/lab')}
          />
          <Row
            label="KEY CLICKS"
            detail="Tiny click sounds. They follow the silent switch."
            keyLabel={sound ? 'ON' : 'OFF'}
            led={sound}
            onPress={() => setSound(!sound)}
          />

          <Section label="DATA" />
          <Row
            label="EXPORT JSON"
            detail="All contexts and entries through the share sheet. Your backup."
            keyLabel="EXPORT"
            dark
            onPress={() => shareExport().catch(() => warning())}
          />
          <Row
            label="SAMPLE DATA"
            detail="Replace everything with three weeks of sample days."
            keyLabel="LOAD"
            onPress={() =>
              confirmReplace('Load sample data?', 'This replaces all your contexts and entries with three weeks of sample data.', loadSampleData)
            }
          />
          <Row
            label="ERASE"
            detail="Delete every context and entry on this phone."
            keyLabel="ERASE"
            danger
            onPress={() => confirmReplace('Erase all data?', 'This deletes every context and entry. Export first if you want a backup.', eraseAllData)}
          />

          <Section label="SHORTCUTS" />
          <Row label="STOP LINK" detail={stopLink} keyLabel="COPY" onPress={() => copy(stopLink)} />
          <Row label="RESUME LINK" detail={resumeLink} keyLabel="COPY" onPress={() => copy(resumeLink)} />
          <Print size={8} color={body.ink3} style={styles.footnote}>
            EACH CONTEXT&apos;S START LINK IS IN ITS PROGRAM SCREEN (TREE › EDIT).
          </Print>
        </ScrollView>
      </View>
    </Body>
  );
}

async function copy(text: string) {
  await Clipboard.setStringAsync(text);
  success();
}

interface RowProps {
  label: string;
  detail: string;
  keyLabel: string;
  onPress: () => void;
  led?: boolean;
  dark?: boolean;
  danger?: boolean;
}

/** A printed label and description next to its key, like a back-panel legend. */
function Row({ label, detail, keyLabel, onPress, led, dark, danger }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Print size={9.5} weight="bold" color={body.ink}>
          {label}
        </Print>
        <Print size={8} weight="regular" color={body.ink2} spacing={0.3} style={styles.detail}>
          {detail}
        </Print>
      </View>
      <Key color={dark ? capDark : capNeutral} height={48} width={96} onPress={onPress} capStyle={styles.keyCap}>
        {led !== undefined ? <Led on={led} size={6} /> : null}
        <Print size={9} weight="bold" color={dark ? '#F4F1EA' : danger ? '#C8321E' : body.ink}>
          {keyLabel}
        </Print>
      </Key>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  about: { height: 190, marginHorizontal: -4, marginTop: 4 },
  aboutContent: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'space-between' },
  aboutTitle: { lineHeight: 32 },
  aboutBody: { lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowText: { flex: 1, gap: 4 },
  detail: { textTransform: 'none', lineHeight: 13 },
  keyCap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footnote: { lineHeight: 13 },
});
