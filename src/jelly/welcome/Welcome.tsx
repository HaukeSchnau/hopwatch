// First launch: no contexts yet, so we go straight to making the first jelly. The
// preview jelly wakes up, takes on the color you pick and wears the emoji you choose.
// With Apple's on-device model, typing a name suggests a fitting emoji and look.

import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type Hue, loadSampleData, newContextId } from '@/core';

import { Character } from '../Character';
import { saveSuggestedLook } from '../character/suggest';
import { buzz, play } from '../feedback';
import { EmojiField, HuePicker } from '../fields';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { useNameSuggestion } from '../suggestions';
import { springs, text, useTheme } from '../theme';
import { JellyButton } from '../ui';

export function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // The preview is seeded by the same id the jelly is created with, so it looks the same.
  const [draftId] = useState(newContextId);
  const [name, setName] = useState('');
  // 💼 until the user picks one, and open to suggestions until then.
  const [emoji, setEmoji] = useState('💼');
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [hue, setHue] = useState<Hue>('pink');
  const face = useFace('awake');
  useLively(face, true);

  const suggested = useNameSuggestion(name, null, !emojiTouched);
  const suggestedEmoji = !emojiTouched ? (suggested?.suggestion.emoji ?? null) : null;
  const shownEmoji = suggestedEmoji ?? emoji;

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
    const id = actions.createContext({
      id: draftId,
      name: trimmed,
      emoji: shownEmoji,
      color: hue,
      pinned: true,
    });
    if (suggested && suggested.forName === trimmed) saveSuggestedLook(id, suggested.suggestion, trimmed);
  };

  const preview: PreviewJelly = {
    id: draftId,
    hue,
    glyph: shownEmoji,
    name: name.trim(),
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.c.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <Text style={[styles.hello, { color: t.c.ink }]}>Hi there!</Text>
      <Text style={[text.body, styles.intro, { color: t.c.muted }]}>
        {"Let's make your first jelly. One for each thing your time goes to: the job, a client, the dog. Tap one to start tracking it."}
      </Text>

      <Animated.View style={[styles.preview, { transformOrigin: 'bottom' }, blob]}>
        <Character context={preview} size={170} face={face} look={suggested?.suggestion.look} />
      </Animated.View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name it, e.g. Job"
        placeholderTextColor={t.c.faint}
        style={[styles.name, { color: t.c.ink, backgroundColor: t.c.card, borderColor: t.c.line }]}
        returnKeyType="done"
        onSubmitEditing={create}
        maxLength={40}
        autoCapitalize="sentences"
      />

      <Text style={[text.headline, styles.label, { color: t.c.ink }]}>Emoji</Text>
      <EmojiField
        value={shownEmoji}
        suggested={suggestedEmoji !== null}
        onChange={(e) => {
          setEmojiTouched(true);
          setEmoji(e);
          bounce();
        }}
      />

      <Text style={[text.headline, styles.label, { color: t.c.ink }]}>Color</Text>
      <HuePicker
        value={hue}
        onChange={(h) => {
          setHue(h);
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
        <Text style={[text.subhead, styles.sampleText, { color: t.c.muted }]}>or load sample data</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24 },
  hello: {
    fontFamily: 'ui-rounded',
    fontWeight: '800',
    fontSize: 40,
    letterSpacing: -0.6,
  },
  intro: { lineHeight: 23, marginTop: 6 },
  preview: { alignSelf: 'center', marginVertical: 18 },
  name: {
    fontFamily: 'ui-rounded',
    fontWeight: '700',
    fontSize: 24,
    borderRadius: 22,
    borderWidth: 2,
    paddingHorizontal: 18,
    height: 62,
  },
  label: { marginTop: 22, marginBottom: 10 },
  cta: { marginTop: 30 },
  sample: { alignSelf: 'center', padding: 14, marginTop: 6 },
  sampleText: { textDecorationLine: 'underline' },
});
