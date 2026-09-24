import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type Hue, loadSampleData } from '@/core';

import { Ambient } from './Ambient';
import { Glass } from './Glass';
import { EmojiRow, firstGrapheme, HueSwatches } from './pickers';
import { useTheme } from './theme';

/**
 * First launch: straight into creating the first context. The room turns the color you
 * pick before the context even exists. Sample data is the quiet way out.
 */
export function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [hue, setHue] = useState<Hue | null>(null);
  const colors = hue ? theme.hue(hue) : null;
  const ready = name.trim().length > 0;

  const create = () => {
    if (!ready) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.createContext({ name, emoji, color: hue ?? 'blue', pinned: true });
  };

  const sample = () =>
    Alert.alert('Load sample data?', 'Three weeks of made-up contexts and entries, to try the timeline and reports.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Load', onPress: loadSampleData },
    ]);

  return (
    <View style={styles.screen}>
      <Ambient hue={hue} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.intro}>
          <Text style={[styles.kicker, { color: theme.secondary }]}>WELCOME TO STINT</Text>
          <Text style={[styles.title, { color: theme.label }]}>What do you spend your time on?</Text>
          <Text style={[styles.body, { color: theme.secondary }]}>
            Start with one context, like your job or the dog. Tap it to start the clock, tap another to switch.
          </Text>
        </Animated.View>

        <View style={styles.preview}>
          <Glass style={styles.tile} tint={colors?.solid}>
            <Text style={styles.tileEmoji}>{emoji ?? '✨'}</Text>
            <Text style={[styles.tileName, { color: colors ? colors.onSolid : theme.secondary }]} numberOfLines={1}>
              {name.trim() || 'Your context'}
            </Text>
          </Glass>
        </View>

        <Glass style={styles.field}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name, e.g. Job"
            placeholderTextColor={theme.tertiary}
            style={[styles.input, { color: theme.label }]}
            returnKeyType="done"
            onSubmitEditing={create}
            maxLength={40}
            autoCapitalize="sentences"
          />
          <View style={[styles.divider, { backgroundColor: theme.separator }]} />
          <TextInput
            value={emoji ?? ''}
            onChangeText={(text) => setEmoji(firstGrapheme(text) || null)}
            placeholder="Emoji"
            placeholderTextColor={theme.tertiary}
            style={[styles.emojiInput, { color: theme.label }]}
            maxLength={16}
          />
        </Glass>

        <Text style={[styles.label, { color: theme.secondary }]}>Emoji</Text>
        <View style={styles.bleed}>
          <EmojiRow value={emoji} onChange={setEmoji} />
        </View>

        <Text style={[styles.label, { color: theme.secondary }]}>Color</Text>
        <HueSwatches value={hue} onChange={setHue} />

        <Pressable accessibilityRole="button" disabled={!ready} onPress={create} style={({ pressed }) => [styles.cta, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
          <Glass interactive tint={ready ? (colors?.solid ?? theme.hue('blue').solid) : theme.fill} style={styles.ctaGlass}>
            <Text style={[styles.ctaText, { color: ready ? (colors?.onSolid ?? '#FFFFFF') : theme.tertiary }]}>Add Context</Text>
          </Glass>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={sample} hitSlop={8} style={styles.sample}>
          <Text style={[styles.sampleText, { color: theme.secondary }]}>or load sample data</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  intro: { gap: 8 },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.2, lineHeight: 40 },
  body: { fontSize: 17, lineHeight: 23 },
  preview: { alignItems: 'center', marginVertical: 28 },
  tile: { width: 128, height: 128, borderRadius: 36, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  tileEmoji: { fontSize: 46, lineHeight: 54 },
  tileName: { fontSize: 15, fontWeight: '600' },
  field: { borderRadius: 26, flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  input: { flex: 1, fontSize: 19, fontWeight: '500', paddingHorizontal: 18, paddingVertical: 14 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 12 },
  emojiInput: { width: 76, fontSize: 19, textAlign: 'center', paddingVertical: 14 },
  label: { fontSize: 15, fontWeight: '600', marginTop: 24, marginBottom: 10, marginLeft: 4 },
  bleed: { marginHorizontal: -20 },
  cta: { marginTop: 32 },
  ctaGlass: { height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  sample: { alignSelf: 'center', marginTop: 18, padding: 6 },
  sampleText: { fontSize: 15, fontWeight: '500' },
});
