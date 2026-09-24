import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, addDays, HOUR, type Hue, loadSampleData, startOfDay, useNow, useTree } from '@/core';

import { Dial } from './Dial';
import { dialFrame } from './geometry';
import { EmojiPicker, fieldStyles, HuePicker } from './pickers';
import { alpha, font, neon, sky } from './theme';
import { Label, PillButton } from './ui';

/**
 * First launch: name the first context, give it an emoji and a color, and it lands
 * pinned on the home screen. Sample data is the quiet alternative.
 */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const empty = useTree().ordered.length === 0;
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [hue, setHue] = useState<Hue>('teal');
  const now = useNow(30_000);
  const dayStart = startOfDay(now);
  const color = neon[hue];
  const frame = dialFrame(Math.min(width - 150, 220), 11, 24);

  const create = () => {
    if (!name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    actions.createContext({ name, emoji, color: hue, pinned: true });
    router.replace('/orbit');
  };

  const sample = () => {
    const load = () => {
      loadSampleData();
      router.replace('/orbit');
    };
    if (empty) load();
    else
      Alert.alert('Replace everything with sample data?', 'Your contexts and entries will be replaced.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Load sample data', style: 'destructive', onPress: load },
      ]);
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View entering={FadeInDown.springify().damping(18)}>
        <Label style={{ color: sky.accent }}>Stint · Orbit</Label>
        <Text style={styles.title}>What do you spend time on?</Text>
        <Text style={styles.body}>
          Start with one thing: the job, a client, the dog. You can nest, pin and recolor later.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(90).springify().damping(18)} style={styles.dialWrap}>
        <Dial
          frame={frame}
          dayStart={dayStart}
          dayEnd={addDays(dayStart, 1)}
          arcs={[{ key: 'preview', start: now - 2.5 * HOUR, end: now, color, running: true }]}
          now={now}
        />
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <View style={[styles.orb, { borderColor: alpha(color, 0.9), backgroundColor: alpha(color, 0.28), shadowColor: color }]}>
            {emoji ? <Text style={{ fontSize: 27 }}>{emoji}</Text> : <Text style={[styles.initial, { color }]}>{name.trim().slice(0, 1).toUpperCase() || '·'}</Text>}
          </View>
          <Text style={styles.previewName} numberOfLines={1}>
            {name.trim() || 'Your first orbit'}
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name, e.g. Job"
          placeholderTextColor={sky.faint}
          keyboardAppearance="dark"
          returnKeyType="done"
          onSubmitEditing={create}
          style={[fieldStyles.input, name.trim() && { borderColor: alpha(color, 0.6) }]}
          accessibilityLabel="Name"
        />
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <HuePicker value={hue} onChange={(h) => h && setHue(h)} />
        <PillButton title="Create" onPress={create} tone={color} solid disabled={!name.trim()} style={styles.create} />
        <Pressable onPress={sample} style={styles.sample} accessibilityRole="button">
          <Text style={styles.sampleText}>or load three weeks of sample data</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22 },
  title: { marginTop: 10, fontFamily: font.display, fontSize: 28, lineHeight: 35, color: sky.text, letterSpacing: -0.8 },
  body: { marginTop: 10, fontFamily: font.text, fontSize: 15, lineHeight: 22, color: sky.dim },
  dialWrap: { alignSelf: 'center', marginVertical: 10 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  orb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  initial: { fontFamily: font.display, fontSize: 24 },
  previewName: { maxWidth: 150, fontFamily: font.textBold, fontSize: 15, color: sky.text },
  form: { gap: 14 },
  create: { height: 56, borderRadius: 28, marginTop: 2 },
  sample: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  sampleText: { fontFamily: font.text, fontSize: 14, color: sky.dim, textDecorationLine: 'underline' },
});
