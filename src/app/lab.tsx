import { InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic } from '@expo-google-fonts/instrument-serif';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type DirectionId, type DirectionInfo, directions, useStint } from '@/core';
import { useHideSplash } from '@/shell/splash';

// Screenshots of each direction: its home and one report screen, taken on the simulator.
const shots: Record<DirectionId, [home: ImageSource, other: ImageSource]> = {
  glass: [require('@/assets/lab/glass-1.jpg'), require('@/assets/lab/glass-2.jpg')],
  deck: [require('@/assets/lab/deck-1.jpg'), require('@/assets/lab/deck-2.jpg')],
  almanac: [require('@/assets/lab/almanac-1.jpg'), require('@/assets/lab/almanac-2.jpg')],
  orbit: [require('@/assets/lab/orbit-1.jpg'), require('@/assets/lab/orbit-2.jpg')],
  jelly: [require('@/assets/lab/jelly-1.jpg'), require('@/assets/lab/jelly-2.jpg')],
};

/**
 * The Lab: picks which of the five design directions the app shows. Opened on first
 * launch and from every direction's settings.
 */
export default function Lab() {
  const [fontsLoaded] = useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic });
  useHideSplash(fontsLoaded);
  const insets = useSafeAreaInsets();
  const active = useStint((s) => s.direction);
  if (!fontsLoaded) return <View style={styles.screen} />;

  const choose = (id: DirectionId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actions.setDirection(id);
    // Directions open the Lab on top of themselves. Clear that stack first, so the old
    // direction unmounts (its timers, animations and forced appearance go with it).
    if (router.canDismiss()) router.dismissAll();
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
              <Poster direction={d} />
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

/** Two tilted screenshots on the direction's own colors, cropped by the card. */
function Poster({ direction }: { direction: DirectionInfo & { id: DirectionId } }) {
  const [home, other] = shots[direction.id];
  const { background, accent } = direction.swatch;
  const dark = direction.id === 'orbit';
  const frame = { borderColor: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)' };
  return (
    <LinearGradient
      colors={[background, `${accent}${dark ? '40' : '66'}`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.poster}>
      <View style={[styles.shotWrap, styles.shotBack]}>
        <Image source={other} style={[styles.shot, frame]} contentFit="cover" />
      </View>
      <View style={[styles.shotWrap, styles.shotFront]}>
        <Image source={home} style={[styles.shot, frame]} contentFit="cover" />
      </View>
    </LinearGradient>
  );
}

const SHOT_WIDTH = 150;
const SHOT_HEIGHT = (SHOT_WIDTH * 1400) / 644;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  wordmark: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 56, color: '#F5F2EC', letterSpacing: -1 },
  lab: { fontFamily: 'InstrumentSerif_400Regular_Italic', color: '#8A8794' },
  intro: { marginTop: 6, fontSize: 16, lineHeight: 22, color: '#A9A6B3' },
  card: { marginHorizontal: 16, marginBottom: 18, borderRadius: 28, backgroundColor: '#16161D', overflow: 'hidden' },
  poster: { height: 250, overflow: 'hidden' },
  shotWrap: {
    position: 'absolute',
    width: SHOT_WIDTH,
    height: SHOT_HEIGHT,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  shotFront: { left: 34, top: 28, transform: [{ rotate: '-5deg' }] },
  shotBack: { right: 34, top: 46, transform: [{ rotate: '6deg' }] },
  shot: { width: '100%', height: '100%', borderRadius: 22, borderWidth: 1 },
  caption: { padding: 18, gap: 4 },
  captionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 24, fontWeight: '700', color: '#F5F2EC', letterSpacing: -0.4 },
  current: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#0B0B0F',
    backgroundColor: '#7CF6D4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: 'hidden',
  },
  tagline: { fontSize: 15, lineHeight: 21, color: '#A9A6B3' },
});
