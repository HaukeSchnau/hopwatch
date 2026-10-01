// Jelly's look: a sunny cream day and a deep plum "night candy", both following the
// system appearance, with saturated candy hues on top. Every context hue maps to a small
// candy palette so gummies, beans, arcs and jars can shade themselves. Type is SF Pro
// Rounded through the system font, with tabular digits for anything that ticks.

import { type TextStyle, useColorScheme } from 'react-native';

import { type Hue, hues } from '@/core';

export type Scheme = 'light' | 'dark';

/** Surface and text colors for one appearance. */
export interface Palette {
  /** The page: warm cream by day, deep plum at night. */
  bg: string;
  /** Wells, chips and pressed states. */
  sunken: string;
  /** Raised cards and grouped rows. */
  card: string;
  line: string;
  ink: string;
  muted: string;
  faint: string;
  pink: string;
  /** Pink that reads as text and tint on `bg`. */
  pinkDeep: string;
  danger: string;
  /** The candy dial's groove: base, inner shade and outer rim. */
  track: string;
  trackShade: string;
  trackRim: string;
  /** The toast: an inverted pill. */
  toast: string;
  onToast: string;
}

const palettes: Record<Scheme, Palette> = {
  light: {
    bg: '#FFF4E8',
    sunken: '#F8E7D5',
    card: '#FFFBF6',
    line: '#EEDCCB',
    ink: '#2B1B3D',
    muted: '#8C7A99',
    faint: '#BCAEC5',
    pink: '#FF6FB5',
    pinkDeep: '#D93A86',
    danger: '#E8434A',
    track: '#F4E2D0',
    trackShade: '#E6CDB6',
    trackRim: '#FFF9F2',
    toast: '#2B1B3D',
    onToast: '#FFFFFF',
  },
  dark: {
    bg: '#150F1D',
    sunken: '#241B2F',
    card: '#1E1728',
    line: '#30263C',
    ink: '#FBF3FF',
    muted: '#A99BB8',
    faint: '#685B79',
    pink: '#FF78BE',
    pinkDeep: '#FF8CC8',
    danger: '#FF6B70',
    track: '#261D31',
    trackShade: '#1A1323',
    trackRim: '#3A2E47',
    toast: '#FBF3FF',
    onToast: '#2B1B3D',
  },
};

export interface Candy {
  /** The main gummy color. */
  fill: string;
  /** Top of the gradient and glossy rim. */
  light: string;
  /** Bottom of the gradient, inner shadow and outlines. */
  deep: string;
  /** Text and icons drawn on `fill`. */
  on: string;
  /** A pale wash of the hue over the page, for backgrounds. */
  tint: string;
  /** A translucent version for colored drop shadows. */
  glow: string;
  /** The hue as readable text and tint on the page. */
  ink: string;
}

type Base = Pick<Candy, 'fill' | 'light' | 'deep' | 'on'>;

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

function luminance(hex: string): number {
  const [r, g, b] = parse(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `color` pushed towards `towards` until it reads on `against`. */
function readable(color: string, against: string, towards: string, ratio: number): string {
  for (let t = 0; t <= 0.8; t += 0.05) {
    const candidate = mix(color, towards, t);
    if (contrast(candidate, against) >= ratio) return candidate;
  }
  return mix(color, towards, 0.8);
}

function buildCandy(scheme: Scheme): Record<Hue, Candy> {
  const p = palettes[scheme];
  const dark = scheme === 'dark';
  return Object.fromEntries(
    hues.map((hue) => {
      const c = base[hue];
      return [
        hue,
        {
          ...c,
          tint: mix(p.bg, c.fill, dark ? 0.2 : 0.16),
          glow: alpha(c.deep, dark ? 0.5 : 0.34),
          ink: dark ? readable(c.light, p.bg, '#FFFFFF', 5) : readable(c.deep, p.bg, '#000000', 3.6),
        },
      ];
    }),
  ) as Record<Hue, Candy>;
}

export interface Theme {
  scheme: Scheme;
  dark: boolean;
  c: Palette;
  candy: Record<Hue, Candy>;
  /** A strong neutral candy for Stop and other serious buttons: plum by day, milk at night. */
  inkCandy: Candy;
  /** A quiet candy for secondary buttons like "All". */
  plainCandy: Candy;
}

const themes: Record<Scheme, Theme> = {
  light: {
    scheme: 'light',
    dark: false,
    c: palettes.light,
    candy: buildCandy('light'),
    inkCandy: { fill: '#3A2852', light: '#5B4677', deep: '#20122F', on: '#FFFFFF', tint: '#F8E7D5', glow: 'rgba(32,18,47,0.3)', ink: '#2B1B3D' },
    plainCandy: { fill: '#FFFBF6', light: '#FFFFFF', deep: '#F3E2D0', on: '#2B1B3D', tint: '#F8E7D5', glow: 'rgba(120,80,60,0.18)', ink: '#2B1B3D' },
  },
  dark: {
    scheme: 'dark',
    dark: true,
    c: palettes.dark,
    candy: buildCandy('dark'),
    inkCandy: { fill: '#F3E8FA', light: '#FFFFFF', deep: '#C9B8D8', on: '#2B1B3D', tint: '#241B2F', glow: 'rgba(0,0,0,0.5)', ink: '#FBF3FF' },
    plainCandy: { fill: '#2C2238', light: '#3D3149', deep: '#1E1728', on: '#FBF3FF', tint: '#241B2F', glow: 'rgba(0,0,0,0.45)', ink: '#FBF3FF' },
  },
};

/** Jelly's theme for the current system appearance. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** The themes, for code outside React. */
export const lightTheme = themes.light;
export const darkTheme = themes.dark;

const rounded = 'ui-rounded';

/**
 * Text styles on SF Pro Rounded, sized like the iOS text styles. Colors come from the
 * theme at the call site.
 */
export const text = {
  largeTitle: { fontFamily: rounded, fontSize: 34, fontWeight: '800', letterSpacing: -0.4 },
  title: { fontFamily: rounded, fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  title2: { fontFamily: rounded, fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  title3: { fontFamily: rounded, fontSize: 20, fontWeight: '700', letterSpacing: -0.1 },
  headline: { fontFamily: rounded, fontSize: 17, fontWeight: '700' },
  body: { fontFamily: rounded, fontSize: 17, fontWeight: '500' },
  callout: { fontFamily: rounded, fontSize: 16, fontWeight: '600' },
  subhead: { fontFamily: rounded, fontSize: 15, fontWeight: '600' },
  footnote: { fontFamily: rounded, fontSize: 13, fontWeight: '600' },
  caption: { fontFamily: rounded, fontSize: 12, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

/** Digits that don't jiggle as they tick. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Springs used across the app. Jelly overshoots; snappy settles fast. */
export const springs = {
  jelly: { damping: 7, stiffness: 260, mass: 0.7 },
  wobble: { damping: 5, stiffness: 180, mass: 0.6 },
  snappy: { damping: 18, stiffness: 320, mass: 0.8 },
  soft: { damping: 14, stiffness: 140, mass: 1 },
} as const;
