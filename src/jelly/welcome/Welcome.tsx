// First launch: no contexts yet, so we go straight to making the first jelly. The
// preview jelly wakes up, takes on the color you pick and wears the emoji you choose.
// With Apple's on-device model, typing a name suggests a fitting emoji, color and look.
// Sample data and restoring an export are the quieter ways in.

import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, DEFAULT_NUDGE_MINUTES, type Hue, loadSampleData, newContextId, requestNudgePermission } from '@/core';
import { welcomeText } from '@/i18n/welcome';

import { Character } from '../Character';
import { lookFor } from '../character/derive';
import { saveSuggestedLook } from '../character/suggest';
import { buzz, play } from '../feedback';
import { EmojiField, HuePicker } from '../fields';
import { useFace, useLively } from '../Gummy';
import type { PreviewJelly } from '../preview';
import { chooseBackup } from '../settings/restore';
import { useNameSuggestion } from '../suggestions';
import { alpha, springs, text, useTheme } from '../theme';
import { JellyButton } from '../ui';

export function Welcome() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // The preview is seeded by the same id the jelly is created with, so it looks the same.
  const [draftId] = useState(newContextId);
  const [name, setName] = useState('');
  // 💼 and pink until the user picks others, and open to suggestions until then.
  const [emoji, setEmoji] = useState('💼');
  const [emojiTouched, setEmojiTouched] = useState(false);
  const [hue, setHue] = useState<Hue>('pink');
  const [hueTouched, setHueTouched] = useState(false);
  const face = useFace('awake');
  useLively(face, true);

  const suggested = useNameSuggestion(name, null, emojiTouched ? emoji : null, !hueTouched);
  const suggestedEmoji = !emojiTouched ? (suggested?.suggestion.emoji ?? null) : null;
  const shownEmoji = suggestedEmoji ?? emoji;
  const suggestedHue = !hueTouched ? (suggested?.suggestion.hue ?? null) : null;
  const shownHue = suggestedHue ?? hue;

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
    begin(() => {
      const id = actions.createContext({
        id: draftId,
        name: trimmed,
        emoji: shownEmoji,
        color: shownHue,
        pinned: true,
      });
      if (suggested && suggested.forName === trimmed) saveSuggestedLook(id, suggested.suggestion, trimmed, shownEmoji);
    });
  };

  const restore = async () => {
    const backup = await chooseBackup(false);
    if (!backup) return;
    buzz.success();
    begin(() => actions.restore(backup));
  };

  const preview: PreviewJelly = {
    id: draftId,
    hue: shownHue,
    glyph: shownEmoji,
    name: name.trim(),
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.c.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Text style={[styles.hello, { color: t.c.ink }]}>{welcomeText.hello}</Text>
        <Text style={[text.body, styles.intro, { color: t.c.muted }]}>{welcomeText.intro}</Text>

        <Animated.View style={[styles.preview, { transformOrigin: 'bottom' }, blob]}>
          <Character context={preview} size={170} face={face} look={suggested ? lookFor(preview, suggested.suggestion) : undefined} />
        </Animated.View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={welcomeText.namePlaceholder}
          placeholderTextColor={t.c.faint}
          style={[styles.name, { color: t.c.ink, backgroundColor: t.c.card, borderColor: t.c.line }]}
          returnKeyType="done"
          onSubmitEditing={create}
          maxLength={40}
          autoCapitalize="sentences"
        />

        <Text style={[text.headline, styles.label, { color: t.c.ink }]}>{welcomeText.emoji}</Text>
        <EmojiField
          value={shownEmoji}
          suggested={suggestedEmoji !== null}
          onChange={(e) => {
            setEmojiTouched(true);
            setEmoji(e);
            bounce();
          }}
        />

        <Text style={[text.headline, styles.label, { color: t.c.ink }]}>
          {welcomeText.color}
          {suggestedHue ? <Text style={[text.subhead, { color: t.c.muted }]}>{`  ${welcomeText.colorSuggested}`}</Text> : null}
        </Text>
        <HuePicker
          value={shownHue}
          onChange={(h) => {
            setHueTouched(true);
            setHue(h);
            bounce();
          }}
        />

        <JellyButton label={welcomeText.make} hue={shownHue} size="large" icon="sparkles" onPress={create} disabled={!name.trim()} style={styles.cta} />

        <Pressable
          onPress={() =>
            Alert.alert(welcomeText.sampleTitle, welcomeText.sampleMessage, [
              { text: welcomeText.cancel, style: 'cancel' },
              { text: welcomeText.load, onPress: () => begin(loadSampleData) },
            ])
          }
          style={({ pressed }) => [styles.link, styles.firstLink, pressed && { opacity: 0.5 }]}
          accessibilityRole="button">
          <Text style={[text.subhead, styles.linkText, { color: t.c.muted }]}>{welcomeText.sample}</Text>
        </Pressable>
        <Pressable onPress={restore} style={({ pressed }) => [styles.link, pressed && { opacity: 0.5 }]} accessibilityRole="button">
          <Text style={[text.subhead, styles.linkText, { color: t.c.muted }]}>{welcomeText.restore}</Text>
        </Pressable>
      </ScrollView>
      {/* The page melts away under the status bar, as on Now. */}
      <LinearGradient
        pointerEvents="none"
        colors={[t.c.bg, alpha(t.c.bg, 0.85), alpha(t.c.bg, 0)]}
        locations={[0, 0.55, 1]}
        style={[styles.fade, { height: insets.top + 14 }]}
      />
    </View>
  );
}

/**
 * Puts the first data in place, then explains the nudge and lets iOS ask for notifications.
 * The ask starts first, so a nudge the new data schedules waits for the explanation.
 */
function begin(setUp: () => void) {
  void requestNudgePermission(explainNudges);
  setUp();
}

/** Resolves once the user has read why Hopwatch wants to send notifications. */
const explainNudges = () =>
  new Promise<void>((resolve) =>
    Alert.alert(welcomeText.nudge.title, welcomeText.nudge.message(DEFAULT_NUDGE_MINUTES / 60), [
      { text: welcomeText.nudge.ok, onPress: () => resolve() },
    ]),
  );

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 24 },
  fade: { position: 'absolute', top: 0, left: 0, right: 0 },
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
  link: { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  firstLink: { marginTop: 12 },
  linkText: { textDecorationLine: 'underline', textAlign: 'center' },
});
