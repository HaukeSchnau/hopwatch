// Jelly's look: a sunny cream base, plum ink and saturated candy hues. Every context
// hue maps to a small candy palette so blobs, beans and jars can shade themselves.

import type { Hue } from '@/core';

export const colors = {
  cream: '#FFF4E8',
  /** Slightly deeper cream for wells, tracks and pressed states. */
  sunken: '#F8E7D5',
  card: '#FFFBF6',
  line: '#EEDCCB',
  ink: '#2B1B3D',
  muted: '#8C7A99',
  faint: '#BCAEC5',
  pink: '#FF6FB5',
  pinkDeep: '#E0438F',
  danger: '#F2555A',
  white: '#FFFFFF',
} as const;

export interface Candy {
  /** The main gummy color. */
  fill: string;
  /** Top of the gradient and glossy rim. */
  light: string;
  /** Bottom of the gradient, inner shadow and outlines. */
  deep: string;
  /** Text and icons drawn on `fill`. */
  on: string;
  /** A pale wash of the hue over cream, for backgrounds. */
  tint: string;
  /** A translucent version for colored drop shadows. */
  glow: string;
}

type Base = Omit<Candy, 'tint' | 'glow'>;

const base: Record<Hue, Base> = {
  red: { fill: '#FF5C6C', light: '#FF9BA6', deep: '#D2324B', on: '#FFFFFF' },
  orange: { fill: '#FF8A3D', light: '#FFB982', deep: '#DE6116', on: '#FFFFFF' },
  amber: { fill: '#FFC53D', light: '#FFE393', deep: '#E39510', on: '#4A2A00' },
  lime: { fill: '#9ED93F', light: '#CDF184', deep: '#68A61B', on: '#223A00' },
  green: { fill: '#34C97E', light: '#86E7B5', deep: '#1B9A5B', on: '#FFFFFF' },
  teal: { fill: '#22BFAE', light: '#79E2D6', deep: '#0E9184', on: '#FFFFFF' },
  cyan: { fill: '#3CC6F0', light: '#93E4FB', deep: '#1896C6', on: '#083246' },
  blue: { fill: '#4B8BFF', light: '#94BAFF', deep: '#2860D8', on: '#FFFFFF' },
  indigo: { fill: '#6E6BF5', light: '#A9A7FF', deep: '#4540CD', on: '#FFFFFF' },
  violet: { fill: '#A36AFF', light: '#CEAEFF', deep: '#773BDB', on: '#FFFFFF' },
  pink: { fill: '#FF6FB5', light: '#FFA9D3', deep: '#DC3F8A', on: '#FFFFFF' },
  gray: { fill: '#A597B3', light: '#D2C8DC', deep: '#76688A', on: '#FFFFFF' },
};

const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Mixes `a` towards `b` by `t` (0 keeps a, 1 gives b). */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a);
  const y = parse(b);
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export const candy = Object.fromEntries(
  (Object.keys(base) as Hue[]).map((hue) => {
    const c = base[hue];
    return [hue, { ...c, tint: mix(colors.cream, c.fill, 0.16), glow: alpha(c.deep, 0.34) }];
  }),
) as Record<Hue, Candy>;

export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  displayMedium: 'Fredoka_500Medium',
  text: 'Nunito_600SemiBold',
  textBold: 'Nunito_700Bold',
  textHeavy: 'Nunito_800ExtraBold',
} as const;

/** Springs used across the direction. Jelly overshoots; snappy settles fast. */
export const springs = {
  jelly: { damping: 7, stiffness: 260, mass: 0.7 },
  wobble: { damping: 5, stiffness: 180, mass: 0.6 },
  snappy: { damping: 18, stiffness: 320, mass: 0.8 },
  soft: { damping: 14, stiffness: 140, mass: 1 },
} as const;

/** Height of the floating tab bar plus its gap to the bottom edge, for scroll padding. */
export const TAB_BAR_HEIGHT = 66;
