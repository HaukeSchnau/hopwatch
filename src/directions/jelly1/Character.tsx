// A context as a character: its gummy blob with the context's emoji stuck on like a
// sticker. Used by tiles, the stage and the flying blob between them.

import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { ResolvedContext } from '@/core';

import { type Face, Gummy } from './Gummy';
import { hashSeed } from './geometry';

interface CharacterProps {
  /** A context, or any look-alike such as the onboarding preview. */
  context: { id: string; hue: ResolvedContext['hue']; glyph: string | null };
  size: number;
  face?: Face;
  mood?: 'awake' | 'asleep';
  shadow?: boolean;
  dim?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Character({ context, size, face, mood, shadow, dim, style }: CharacterProps) {
  // Each sticker leans its own way, like it was slapped on by hand.
  const tilt = (hashSeed(context.id) % 24) - 6;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Gummy size={size} hue={context.hue} seed={context.id} face={face} mood={mood} shadow={shadow} dim={dim} />
      {context.glyph ? (
        <View
          style={[
            styles.sticker,
            {
              width: size * 0.34,
              height: size * 0.34,
              borderRadius: size * 0.17,
              right: -size * 0.02,
              top: size * 0.01,
              transform: [{ rotate: `${tilt}deg` }],
            },
            dim && { opacity: 0.5 },
          ]}>
          <Text allowFontScaling={false} style={{ fontSize: size * 0.2, lineHeight: size * 0.26 }}>
            {context.glyph}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
