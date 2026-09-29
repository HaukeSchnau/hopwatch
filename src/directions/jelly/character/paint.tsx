// Shared paint for the characters: the candy material, fixed accessory palettes and the
// face ink. Characters look the same in light and dark appearance; only their colored
// shadow follows the theme.

import { LinearGradient, Path, Shadow, type SkPath, vec } from '@shopify/react-native-skia';

import type { Hue } from '@/core';

import { alpha, type Candy } from '../theme';

/** Plum for eyes, mouths and frames, on every body color and in both appearances. */
export const INK = '#2B1B3D';
export const TONGUE = '#FF7A9C';

/** Three tones are all a part needs to look like candy. */
export type Tones = Pick<Candy, 'light' | 'fill' | 'deep'>;

export const gold: Tones = { light: '#FFF1A6', fill: '#FFC93A', deep: '#D08A06' };
export const ivory: Tones = { light: '#FFFDF7', fill: '#F6E6C4', deep: '#D2B383' };
export const white: Tones = { light: '#FFFFFF', fill: '#FBF7FD', deep: '#D9CFE4' };
export const leaf: Tones = { light: '#B4F29A', fill: '#52CC66', deep: '#1F9447' };
export const plum: Tones = { light: '#5B4677', fill: '#3A2852', deep: '#1E1230' };

/** A contrasting hue for hats, bows and ties, chosen so it pops on the body. */
export const accentHue: Record<Hue, Hue> = {
  red: 'amber',
  orange: 'blue',
  amber: 'pink',
  lime: 'violet',
  green: 'pink',
  teal: 'amber',
  cyan: 'pink',
  blue: 'amber',
  indigo: 'pink',
  violet: 'amber',
  pink: 'cyan',
  gray: 'pink',
};

/** Blush that shows on the body: pink on most hues, a pale glow on pink and red ones. */
export const blushFor = (hue: Hue) => (hue === 'pink' || hue === 'red' ? 'rgba(255,255,255,0.3)' : 'rgba(255,96,146,0.36)');

interface CandyPathProps {
  path: SkPath | string;
  tones: Tones;
  /** Gradient span, top to bottom, in the same space as the path. */
  top: number;
  bottom: number;
  /** A darker inner rim along the bottom, like light through jelly. */
  inner?: boolean;
}

/** A path filled like glossy candy: a light-to-deep gradient and a soft inner shade. */
export function CandyPath({ path, tones, top, bottom, inner = true }: CandyPathProps) {
  const h = bottom - top;
  return (
    <Path path={path}>
      <LinearGradient start={vec(0, top)} end={vec(0, bottom)} colors={[tones.light, tones.fill, tones.deep]} positions={[0, 0.5, 1]} />
      {inner && <Shadow dx={0} dy={-h * 0.12} blur={h * 0.1} color={alpha(tones.deep, 0.55)} inner />}
    </Path>
  );
}
