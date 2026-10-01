// Settings: the Lab, export, sounds, sample data, erasing, and a word on the idea.

import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eraseAllData, loadSampleData, resumeLink, shareExport, stopLink, useTree } from '@/core';

import { Character } from '../Character';
import { buzz, setSounds, usePrefs } from '../feedback';
import { useFace, useLively } from '../Gummy';
import { alpha, candy, colors, fonts, TAB_BAR_HEIGHT } from '../theme';
import { say } from '../Toast';
import { JellySwitch, Squishy } from '../ui';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const sounds = usePrefs((s) => s.sounds);
  const count = useTree().ordered.length;
  const face = useFace('awake');
  useLively(face, true);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 40 }}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.idea}>
        <Character context={{ id: 'settings-mascot', hue: 'pink', glyph: '🍬' }} size={92} face={face} />
        <View style={{ flex: 1 }}>
          <Text style={styles.ideaTitle}>Jelly</Text>
          <Text style={styles.ideaText}>
            Every context is a gummy with a face. The one you're on is awake on the stage; the rest nap in their slots until you tap
            them.
          </Text>
        </View>
      </View>

      <Group>
        <Item icon="flask.fill" hue="violet" label="Open the Lab" detail="Try another direction" onPress={() => router.push('/lab')} />
        <Item
          icon="square.and.arrow.up"
          hue="blue"
          label="Export data"
          detail="All jellies and entries as JSON"
          onPress={() => shareExport().catch((e: unknown) => Alert.alert('Export failed', String(e)))}
        />
        <View style={styles.item}>
          <Icon name="speaker.wave.2.fill" hue="orange" />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Squishy sounds</Text>
            <Text style={styles.detail}>Quiet pops; follow the ringer switch</Text>
          </View>
          <JellySwitch value={sounds} onValueChange={setSounds} accessibilityLabel="Squishy sounds" />
        </View>
      </Group>

      <Text style={styles.section}>Shortcuts</Text>
      <Group>
        <Item icon="stop.fill" hue="gray" label="Copy stop link" detail={stopLink} onPress={() => copy(stopLink, 'Stop link copied')} />
        <Item icon="play.fill" hue="green" label="Copy resume link" detail={resumeLink} onPress={() => copy(resumeLink, 'Resume link copied')} />
      </Group>
      <Text style={styles.footnote}>Each jelly's own start link is in its editor under Stuff.</Text>

      <Text style={styles.section}>Data</Text>
      <Group>
        <Item
          icon="sparkles"
          hue="amber"
          label="Load sample data"
          detail="Three weeks of made-up days"
          onPress={() =>
            Alert.alert('Replace everything with sample data?', `This deletes your ${count} jellies and all entries.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Load sample',
                style: 'destructive',
                onPress: () => {
                  loadSampleData();
                  buzz.success();
                  router.navigate('/jelly1');
                },
              },
            ])
          }
        />
        <Item
          icon="trash"
          hue="red"
          label="Erase all data"
          detail="Start over from scratch"
          destructive
          onPress={() =>
            Alert.alert('Erase all data?', 'Every jelly and every entry goes. Export first if you want a backup.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase',
                style: 'destructive',
                onPress: () => {
                  eraseAllData();
                  buzz.thud();
                },
              },
            ])
          }
        />
      </Group>
    </ScrollView>
  );
}

function copy(text: string, message: string) {
  Clipboard.setStringAsync(text);
  buzz.success();
  say(message);
}

function Group({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Icon({ name, hue }: { name: SymbolViewProps['name']; hue: keyof typeof candy }) {
  return (
    <View style={[styles.icon, { backgroundColor: candy[hue].fill }]}>
      <SymbolView name={name} size={16} tintColor={candy[hue].on} weight="bold" />
    </View>
  );
}

function Item({
  icon,
  hue,
  label,
  detail,
  onPress,
  destructive,
}: {
  icon: SymbolViewProps['name'];
  hue: keyof typeof candy;
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Squishy amount={0.04} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.item}>
        <Icon name={icon} hue={hue} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, destructive && { color: colors.danger }]}>{label}</Text>
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        <SymbolView name="chevron.right" size={13} tintColor={colors.faint} weight="bold" />
      </View>
    </Squishy>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.ink, letterSpacing: -0.4, marginHorizontal: 22, marginBottom: 12 },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    paddingLeft: 8,
    borderRadius: 28,
    backgroundColor: candy.pink.tint,
    marginBottom: 18,
  },
  ideaTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.ink },
  ideaText: { fontFamily: fonts.text, fontSize: 14.5, lineHeight: 20, color: colors.ink, opacity: 0.8, marginTop: 2 },
  section: { fontFamily: fonts.displayMedium, fontSize: 14, color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginHorizontal: 24, marginTop: 24, marginBottom: 10 },
  group: { backgroundColor: colors.card, borderRadius: 26, marginHorizontal: 16, paddingVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, minHeight: 62, borderBottomWidth: 1.5, borderBottomColor: alpha(colors.ink, 0.04) },
  icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  detail: { fontFamily: fonts.text, fontSize: 13, color: colors.muted, marginTop: -1 },
  footnote: { fontFamily: fonts.text, fontSize: 13, color: colors.muted, marginHorizontal: 24, marginTop: 8 },
});
