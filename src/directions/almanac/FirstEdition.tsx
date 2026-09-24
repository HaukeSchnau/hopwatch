import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type Hue, loadSampleData } from '@/core';

import { Paper } from './Paper';
import { EmojiPicker, InkPicker } from './pickers';
import { font, ink, margin, paper, riso } from './theme';
import { Caps, InkLink, Rule } from './type';

/**
 * First launch: no contexts yet, so the front page asks for the first one instead of
 * printing an empty board. Sample data is the quiet way out.
 */
export function FirstEdition() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>('💼');
  const [hue, setHue] = useState<Hue | null>('blue');
  const ready = name.trim().length > 0;
  const shown = hue ?? 'gray';

  const create = () => {
    if (!ready) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.createContext({ name, emoji, color: hue, pinned: true });
  };

  return (
    <View style={{ flex: 1 }}>
      <Paper />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 40, paddingHorizontal: margin }}>
        <Text style={styles.masthead}>The Daily Stint</Text>
        <Rule weight="heavy" />
        <View style={styles.dateline}>
          <Caps color={ink.full}>First edition</Caps>
          <Caps color={ink.full}>Vol. I · No. 1</Caps>
        </View>
        <Rule weight="regular" />

        <Animated.Text entering={FadeInDown.delay(80).duration(420)} style={styles.headline}>
          What shall we keep time on first?
        </Animated.Text>
        <Text style={styles.deck}>
          A job, a client, the dog. One word is plenty; you can nest and rename things later.
        </Text>

        <TextInput
          selectionColor={ink.red}
          value={name}
          onChangeText={setName}
          placeholder="Job"
          placeholderTextColor={ink.faint}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={create}
          style={[styles.nameInput, { borderBottomColor: riso[shown].fill }]}
          accessibilityLabel="Name"
        />

        <View style={styles.block}>
          <Caps color={ink.full} style={styles.label}>
            A mark
          </Caps>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </View>

        <View style={styles.block}>
          <Caps color={ink.full} style={styles.label}>
            An ink
          </Caps>
          <InkPicker value={hue} onChange={setHue} />
        </View>

        <Text style={styles.preview}>
          It will sit on the front page as{' '}
          <Text style={{ fontFamily: font.displayItalic, color: riso[shown].type }}>
            {emoji ? `${emoji} ` : ''}
            {name.trim() || 'Job'}
          </Text>
          , one tap away.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={!ready}
          onPress={create}
          style={({ pressed }) => [styles.primary, !ready && { opacity: 0.35 }, pressed && { transform: [{ translateY: 1 }] }]}>
          <Text style={styles.primaryText}>Set it in type →</Text>
        </Pressable>

        <View style={styles.sample}>
          <Text style={styles.sampleText}>Just looking around?</Text>
          <InkLink
            textStyle={styles.sampleLink}
            color={ink.soft}
            onPress={() =>
              Alert.alert('Load sample data?', 'Three weeks of made-up days: a job, two clients, a dog. You can erase it later in the Colophon.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Load it', onPress: loadSampleData },
              ])
            }>
            Load sample data
          </InkLink>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  masthead: { fontFamily: font.display, fontSize: 42, lineHeight: 50, textAlign: 'center', color: ink.full },
  dateline: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  headline: { marginTop: 26, fontFamily: font.display, fontSize: 44, lineHeight: 45, letterSpacing: -0.5, color: ink.full },
  deck: { marginTop: 10, fontFamily: font.textItalic, fontSize: 17, lineHeight: 23, color: ink.soft },
  nameInput: {
    marginTop: 22,
    fontFamily: font.displayItalic,
    fontSize: 44,
    color: ink.full,
    paddingVertical: 6,
    borderBottomWidth: 3,
  },
  block: { marginTop: 26 },
  label: { marginBottom: 10 },
  preview: { marginTop: 28, fontFamily: font.text, fontSize: 18, lineHeight: 25, color: ink.full },
  primary: {
    marginTop: 22,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ink.full,
    boxShadow: `3px 3px 0 ${paper.well}`,
  },
  primaryText: { fontFamily: font.displayItalic, fontSize: 26, color: paper.sheet },
  sample: { marginTop: 26, alignItems: 'center', gap: 2 },
  sampleText: { fontFamily: font.textItalic, fontSize: 15, color: ink.faint },
  sampleLink: { fontFamily: font.textItalic, fontSize: 17 },
});
