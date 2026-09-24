// First launch: no contexts yet, so we go straight to making the first jelly. The
// preview blob wakes up, takes on the color you pick and wears the emoji you choose.

import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type Hue, loadSampleData } from '@/core';

import { Character } from '../Character';
import { buzz, play } from '../feedback';
import { EmojiField, HuePicker } from '../fields';
import { useFace, useLively } from '../Gummy';
import { colors, fonts, springs } from '../theme';
import { JellyButton } from '../ui';

export function Welcome() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>('💼');
  const [hue, setHue] = useState<Hue>('pink');
  const face = useFace('awake');
  useLively(face, true);

  const jiggle = useSharedValue(0);
  const bounce = () => jiggle.set(withSequence(withTiming(0.2, { duration: 70 }), withSpring(0, springs.wobble)));
  const blob = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 - jiggle.get() }, { scaleX: 1 + jiggle.get() * 0.8 }],
  }));

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    buzz.success();
    play('pop');
    actions.createContext({ name: trimmed, emoji, color: hue, pinned: true });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Text style={styles.hello}>Hi there!</Text>
      <Text style={styles.intro}>
        Let's make your first jelly. One for each thing your time goes to: the job, a client, the dog. Tap one to start tracking it.
      </Text>

      <Animated.View style={[styles.preview, { transformOrigin: 'bottom' }, blob]}>
        <Character context={{ id: 'welcome-jelly', hue, glyph: emoji }} size={170} face={face} />
      </Animated.View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name it, e.g. Job"
        placeholderTextColor={colors.faint}
        style={styles.name}
        returnKeyType="done"
        onSubmitEditing={create}
        maxLength={40}
        autoCapitalize="sentences"
      />

      <Text style={styles.label}>Emoji</Text>
      <EmojiField
        value={emoji}
        onChange={(e) => {
          setEmoji(e);
          bounce();
        }}
      />

      <Text style={styles.label}>Color</Text>
      <HuePicker
        value={hue}
        onChange={(h) => {
          if (h) setHue(h);
          bounce();
        }}
      />

      <JellyButton label="Make it!" hue={hue} size="large" icon="sparkles" onPress={create} disabled={!name.trim()} style={styles.cta} />

      <Pressable
        onPress={() =>
          Alert.alert('Load sample data?', 'Three weeks of made-up days with 18 jellies, to try out the timeline and reports.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Load', onPress: () => loadSampleData() },
          ])
        }
        style={({ pressed }) => [styles.sample, pressed && { opacity: 0.5 }]}
        accessibilityRole="button">
        <Text style={styles.sampleText}>or load sample data</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: 24 },
  hello: { fontFamily: fonts.displayBold, fontSize: 40, color: colors.ink, letterSpacing: -0.6 },
  intro: { fontFamily: fonts.text, fontSize: 17, lineHeight: 23, color: colors.muted, marginTop: 6 },
  preview: { alignSelf: 'center', marginVertical: 18 },
  name: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: 18,
    height: 64,
  },
  label: { fontFamily: fonts.displayMedium, fontSize: 15, color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 22, marginBottom: 10 },
  cta: { marginTop: 30 },
  sample: { alignSelf: 'center', padding: 14, marginTop: 6 },
  sampleText: { fontFamily: fonts.textBold, fontSize: 15, color: colors.muted, textDecorationLine: 'underline' },
});
