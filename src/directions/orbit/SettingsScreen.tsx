import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { eraseAllData, loadSampleData, resumeLink, shareExport, stopLink } from '@/core';

import { useTabBarClearance } from './TabBar';
import { alpha, font, sky } from './theme';
import { Label } from './ui';

/** The Lab, export, deep links for Shortcuts, sample data and erase. */
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();

  const confirm = (title: string, message: string, action: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: 'destructive',
        onPress: () => {
          run();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.navigate('/orbit');
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: clearance }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.about}>
        <Label style={{ color: sky.accent }}>Orbit</Label>
        <Text style={styles.aboutText}>
          Your day as a 24-hour dial. Midnight sits at the bottom and noon at the top, so the working day arcs overhead
          like the sun.
        </Text>
        <Text style={styles.aboutText}>
          Forgot to switch? Long-press an orb or Stop and scrub the ring back to when it really happened.
        </Text>
      </View>

      <Group>
        <Row icon="square.stack.3d.up" title="Try another direction" detail="Open the Lab" onPress={() => router.push('/lab')} />
        <Row icon="square.and.arrow.up" title="Export JSON" detail="Every context and entry" onPress={() => shareExport()} />
      </Group>

      <Label style={styles.groupLabel}>Shortcuts</Label>
      <Group>
        <CopyRow title="Stop link" link={stopLink} />
        <CopyRow title="Resume link" link={resumeLink} />
      </Group>
      <Text style={styles.footnote}>
        Open these from the Shortcuts app, the Action Button or an automation. Each context's settings has its own start
        link.
      </Text>

      <Label style={styles.groupLabel}>Data</Label>
      <Group>
        <Row
          icon="sparkles"
          title="Load sample data"
          detail="Three weeks, replaces everything"
          onPress={() =>
            confirm('Load sample data?', 'This replaces all your contexts and entries with three weeks of samples.', 'Replace', loadSampleData)
          }
        />
        <Row
          icon="trash"
          title="Erase all data"
          tone={sky.danger}
          onPress={() => confirm('Erase everything?', 'All contexts and entries are deleted from this phone.', 'Erase', eraseAllData)}
        />
      </Group>
      <Text style={styles.version}>Stint Five · Orbit</Text>
    </ScrollView>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Row({
  icon,
  title,
  detail,
  tone = sky.text,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  detail?: string;
  tone?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${title}. ${detail}` : title}>
      <View style={[styles.icon, { backgroundColor: alpha(tone === sky.text ? sky.accent : tone, 0.12) }]}>
        <SymbolView name={icon} size={16} tintColor={tone === sky.text ? sky.accent : tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: tone }]}>{title}</Text>
        {detail && <Text style={styles.rowDetail}>{detail}</Text>}
      </View>
      <SymbolView name="chevron.right" size={12} tintColor={sky.faint} weight="semibold" />
    </Pressable>
  );
}

function CopyRow({ title, link }: { title: string; link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Pressable
      onPress={async () => {
        await Clipboard.setStringAsync(link);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCopied(true);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${title}`}>
      <View style={[styles.icon, { backgroundColor: alpha(sky.accent, 0.12) }]}>
        <SymbolView name="link" size={16} tintColor={sky.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.link}>{link}</Text>
      </View>
      <Text style={styles.copy}>{copied ? 'Copied' : 'Copy'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.display, fontSize: 28, color: sky.text, letterSpacing: -0.8, marginHorizontal: 22, marginBottom: 16 },
  about: {
    marginHorizontal: 16,
    padding: 18,
    gap: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: alpha(sky.accent, 0.25),
    backgroundColor: alpha(sky.accent, 0.05),
    marginBottom: 18,
  },
  aboutText: { fontFamily: font.text, fontSize: 14.5, lineHeight: 21, color: sky.text },
  group: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  groupLabel: { marginLeft: 30, marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16 },
  pressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: font.textMedium, fontSize: 16, color: sky.text },
  rowDetail: { marginTop: 2, fontFamily: font.text, fontSize: 12.5, color: sky.dim },
  link: { marginTop: 2, fontFamily: font.mono, fontSize: 11.5, color: sky.dim },
  copy: { fontFamily: font.textBold, fontSize: 14, color: sky.accent },
  footnote: { marginHorizontal: 30, marginTop: 8, fontFamily: font.text, fontSize: 12.5, lineHeight: 18, color: sky.faint },
  version: { textAlign: 'center', marginTop: 28, fontFamily: font.mono, fontSize: 10.5, letterSpacing: 1.4, color: sky.faint, textTransform: 'uppercase' },
});
