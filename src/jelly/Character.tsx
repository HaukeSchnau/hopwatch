// A context as a character: its gummy in the context's color and look, with the emoji
// stuck on like a sticker. Used by tiles, the stage, sheets and the flying blob between
// them. The look resolves per context (custom > model-picked > derived, see
// character/look.ts), and an awake face idles in the look's personality.

import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { ResolvedContext } from '@/core';

import type { LookSource } from './character/derive';
import { useLook } from './character/look';
import { type Look, withTraits } from './character/traits';
import { hashSeed } from './geometry';
import { type Face, Gummy, useFace } from './Gummy';

export interface CharacterProps {
  /** A context, or any look-alike such as the onboarding preview. */
  context: LookSource & { hue: ResolvedContext['hue'] };
  size: number;
  face?: Face;
  /** Used when no `face` is passed. */
  mood?: 'awake' | 'asleep';
  shadow?: boolean;
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Traits for a live preview, over the resolved look. Never stored. */
  look?: Partial<Look>;
  /** The emoji sticker. Shown from 36 pt unless set. */
  sticker?: boolean;
}

/** Stickers never shrink below this, so the emoji reads at a glance in list rows. */
const STICKER_MIN = 23;

/**
 * The sticker's size and offset from the bottom right corner: about a third of the
 * jelly, at least STICKER_MIN. Its left edge stays right of the face, so on small jellies
 * it hangs out of the box like a badge (by up to 13 pt; rows leave room for it).
 */
function stickerFrame(size: number) {
  const badge = Math.max(STICKER_MIN, size * 0.32);
  return { badge, right: size * 0.28 - badge, bottom: size * 0.02 - (badge - size * 0.32) * 0.3 };
}

export function Character({ context, size, face, mood = 'asleep', shadow, dim, style, look: preview, sticker = size >= 36 }: CharacterProps) {
  const look = withTraits(useLook(context), preview);
  const own = useFace(mood);
  const f = face ?? own;
  useEffect(() => {
    f.motion.set(look.motion);
  }, [f, look.motion]);

  const body = useAnimatedStyle(() => {
    const puff = f.puff.get() * 0.07;
    const squash = f.squash.get() * 0.12;
    return {
      transform: [
        { translateY: -f.hop.get() * size * 0.14 },
        { translateX: f.shiver.get() * size * 0.014 },
        { rotate: `${f.tilt.get()}deg` },
        { scaleX: 1 + puff + squash },
        { scaleY: 1 + puff - squash },
      ],
    };
  });

  // Each sticker leans its own way, like it was slapped on by hand.
  const tilt = (hashSeed(context.id) % 24) - 12;
  const { badge, right, bottom } = stickerFrame(size);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.origin, body]}>
        <Gummy size={size} hue={context.hue} look={look} seed={context.id} face={f} shadow={shadow} dim={dim} />
        {sticker && context.glyph ? (
          <View
            style={[
              styles.sticker,
              {
                width: badge,
                height: badge,
                borderRadius: badge / 2,
                right,
                bottom,
                transform: [{ rotate: `${tilt}deg` }],
              },
              dim && { opacity: 0.5 },
            ]}>
            <Text allowFontScaling={false} style={{ fontSize: badge * 0.64, lineHeight: badge * 0.82 }}>
              {context.glyph}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { transformOrigin: '50% 90%' },
  sticker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2B1B3D',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
  },
});
