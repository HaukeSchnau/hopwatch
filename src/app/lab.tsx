import { Doto_700Bold } from '@expo-google-fonts/doto';
import { Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { actions, type DirectionId, directions, useStint } from '@/core';
import { useHideSplash } from '@/shell/splash';

/**
 * The Lab: picks which of the five design directions the app shows. Opened on first
 * launch and from every direction's settings.
 */
export default function Lab() {
  const [fontsLoaded] = useFonts({
    Doto_700Bold,
    Fredoka_600SemiBold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Unbounded_600SemiBold,
  });
  useHideSplash(fontsLoaded);
  const insets = useSafeAreaInsets();
  const active = useStint((s) => s.direction);
  if (!fontsLoaded) return <View style={styles.screen} />;

  const choose = (id: DirectionId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actions.setDirection(id);
    router.replace(`/${id}`);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 28, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.header}>
          <Text style={styles.wordmark}>
            stint<Text style={{ color: '#FF6FB5' }}>.</Text> <Text style={styles.lab}>lab</Text>
          </Text>
          <Text style={styles.intro}>
            Five takes on the same tracker. Same data, same features. Pick one and switch whenever you like from its
            settings.
          </Text>
        </View>
        {directions.map((d, i) => (
          <Animated.View key={d.id} entering={FadeInDown.delay(80 * i).springify().damping(18)}>
            <Pressable
              onPress={() => choose(d.id)}
              style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <View style={[styles.poster, { backgroundColor: d.swatch.background }]}>{posters[d.id]}</View>
              <View style={styles.caption}>
                <View style={styles.captionTop}>
                  <Text style={styles.name}>{d.name}</Text>
                  {active === d.id && <Text style={styles.current}>IN USE</Text>}
                </View>
                <Text style={styles.tagline}>{d.tagline}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  wordmark: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 56, color: '#F5F2EC', letterSpacing: -1 },
  lab: { fontFamily: 'InstrumentSerif_400Regular_Italic', color: '#8A8794' },
  intro: { marginTop: 6, fontSize: 16, lineHeight: 22, color: '#A9A6B3' },
  card: { marginHorizontal: 16, marginBottom: 18, borderRadius: 28, backgroundColor: '#16161D', overflow: 'hidden' },
  poster: { height: 190, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  caption: { padding: 18, gap: 4 },
  captionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 24, fontWeight: '700', color: '#F5F2EC', letterSpacing: -0.4 },
  current: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: '#0B0B0F', backgroundColor: '#7CF6D4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: 'hidden' },
  tagline: { fontSize: 15, lineHeight: 21, color: '#A9A6B3' },
});

const posterStyles = StyleSheet.create({
  glassCard: {
    margin: 26,
    padding: 18,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  glassPath: { fontSize: 13, fontWeight: '600', color: 'rgba(11,16,32,0.6)' },
  glassTime: { fontSize: 52, fontWeight: '700', color: '#0B1020', fontVariant: ['tabular-nums'], letterSpacing: -1.5 },
  glassPill: { alignSelf: 'flex-start', backgroundColor: '#3D8BFD', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99 },
  glassPillText: { color: 'white', fontWeight: '700', fontSize: 14 },
  deck: { flex: 1, alignSelf: 'stretch', padding: 22, gap: 16 },
  lcd: { backgroundColor: '#161514', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  lcdLabel: { fontFamily: 'Doto_700Bold', color: '#FF8A3D', fontSize: 14, letterSpacing: 1 },
  lcdTime: { fontFamily: 'Doto_700Bold', color: '#FFB27A', fontSize: 44, letterSpacing: 2 },
  keys: { flexDirection: 'row', gap: 12 },
  key: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  almanac: { flex: 1, alignSelf: 'stretch', paddingHorizontal: 24, paddingTop: 22 },
  masthead: { fontSize: 11, letterSpacing: 2, color: '#6D675D', fontWeight: '600' },
  headline: { marginTop: 10, fontFamily: 'InstrumentSerif_400Regular', fontSize: 34, lineHeight: 36, color: '#1C1A17' },
  headlineItalic: { fontFamily: 'InstrumentSerif_400Regular_Italic', color: '#E4572E' },
  rule: { marginTop: 14, height: 1, backgroundColor: '#1C1A17' },
  orbit: { alignItems: 'center', justifyContent: 'center' },
  orbitTime: { position: 'absolute', fontFamily: 'Unbounded_600SemiBold', fontSize: 30, color: '#E8ECFF' },
  jelly: { alignItems: 'center', justifyContent: 'center' },
  jellyText: { position: 'absolute', bottom: -4, right: -30, fontFamily: 'Fredoka_600SemiBold', fontSize: 26, color: '#2B1B3D', transform: [{ rotate: '-8deg' }] },
});

// Small posters that hint at each direction's look.
const posters: Record<DirectionId, ReactNode> = {
  glass: (
    <LinearGradient colors={['#8EC5FF', '#B9A6FF', '#FFC6E4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
      <View style={posterStyles.glassCard}>
        <Text style={posterStyles.glassPath}>Clients › Acme</Text>
        <Text style={posterStyles.glassTime}>1:24</Text>
        <View style={posterStyles.glassPill}>
          <Text style={posterStyles.glassPillText}>Back to Job</Text>
        </View>
      </View>
    </LinearGradient>
  ),
  deck: (
    <View style={posterStyles.deck}>
      <View style={posterStyles.lcd}>
        <Text style={posterStyles.lcdLabel}>▶ DEEP WORK</Text>
        <Text style={posterStyles.lcdTime}>01:24</Text>
      </View>
      <View style={posterStyles.keys}>
        {['#FF5B00', '#2B2B2B', '#EDEAE3', '#3D8BFD'].map((color) => (
          <View key={color} style={[posterStyles.key, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  ),
  almanac: (
    <View style={posterStyles.almanac}>
      <Text style={posterStyles.masthead}>WEDNESDAY · 24 SEPTEMBER</Text>
      <Text style={posterStyles.headline}>
        On <Text style={posterStyles.headlineItalic}>Acme Website</Text> for one hour and twenty-four minutes.
      </Text>
      <View style={posterStyles.rule} />
    </View>
  ),
  orbit: (
    <View style={posterStyles.orbit}>
      <Svg width={150} height={150} viewBox="0 0 150 150">
        <Circle cx={75} cy={75} r={60} stroke="#1B1F2E" strokeWidth={10} fill="none" />
        <Path d="M75 15 A60 60 0 0 1 135 75" stroke="#7CF6D4" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.95} />
        <Path d="M135 75 A60 60 0 0 1 102 128" stroke="#FF6FB5" strokeWidth={10} strokeLinecap="round" fill="none" />
        <Path d="M60 132 A60 60 0 0 1 22 101" stroke="#8B7CFF" strokeWidth={10} strokeLinecap="round" fill="none" />
      </Svg>
      <Text style={posterStyles.orbitTime}>1:24</Text>
    </View>
  ),
  jelly: (
    <View style={posterStyles.jelly}>
      <Svg width={170} height={140} viewBox="0 0 170 140">
        <Path
          d="M85 12 C128 8 160 40 156 78 C152 118 116 134 82 130 C44 126 12 108 14 70 C16 34 46 15 85 12 Z"
          fill="#FF6FB5"
        />
        <Circle cx={66} cy={66} r={9} fill="#2B1B3D" />
        <Circle cx={104} cy={66} r={9} fill="#2B1B3D" />
        <Circle cx={69} cy={63} r={3} fill="#FFF" />
        <Circle cx={107} cy={63} r={3} fill="#FFF" />
        <Path d="M74 90 Q85 100 96 90" stroke="#2B1B3D" strokeWidth={5} strokeLinecap="round" fill="none" />
      </Svg>
      <Text style={posterStyles.jellyText}>Dog!</Text>
    </View>
  ),
};
