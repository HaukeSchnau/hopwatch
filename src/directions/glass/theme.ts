// Glass's palette: Apple's iOS 26 system colors per appearance, the semantic label and
// fill colors, and the ambient mesh palettes that tint the whole room.

import { type Hue, hues } from '@/core';
import { useColorScheme } from 'react-native';

import { alpha, contrast, mix } from './color';

export type Scheme = 'light' | 'dark';

/** The iOS 26 system colors. Lime has no system twin, so it sits between yellow and green. */
const system: Record<Hue, Record<Scheme, string>> = {
  red: { light: '#FF383C', dark: '#FF4245' },
  orange: { light: '#FF8D28', dark: '#FF9230' },
  amber: { light: '#FFCC00', dark: '#FFD600' },
  lime: { light: '#A2C617', dark: '#B8DF3A' },
  green: { light: '#34C759', dark: '#30D158' },
  teal: { light: '#00C8B3', dark: '#00DAC3' },
  cyan: { light: '#00C0E8', dark: '#3CD3FE' },
  blue: { light: '#0088FF', dark: '#0091FF' },
  indigo: { light: '#6155F5', dark: '#6D7CFF' },
  violet: { light: '#CB30E0', dark: '#DB34F2' },
  pink: { light: '#FF2D55', dark: '#FF375F' },
  gray: { light: '#8E8E93', dark: '#98989D' },
};

/** Neighbouring hues, blended into the mesh so it reads as light rather than paint. */
const neighbours: Record<Hue, [Hue, Hue]> = {
  red: ['pink', 'orange'],
  orange: ['amber', 'red'],
  amber: ['orange', 'lime'],
  lime: ['green', 'amber'],
  green: ['teal', 'lime'],
  teal: ['cyan', 'green'],
  cyan: ['blue', 'teal'],
  blue: ['indigo', 'cyan'],
  indigo: ['violet', 'blue'],
  violet: ['pink', 'indigo'],
  pink: ['violet', 'red'],
  gray: ['indigo', 'cyan'],
};

export interface HueColors {
  /** The system color itself: tile fills, the running dot, chart bars. */
  solid: string;
  /** Text and glyphs on top of `solid`. */
  onSolid: string;
  /** The hue as readable text on the app background. */
  ink: string;
  /** Translucent tint for chips and badges. */
  soft: string;
  /** Nearly opaque pastel for timeline blocks, so the room's color doesn't muddy them. */
  block: string;
  /** Tint for native controls in forms, or undefined where the hue is too pale for text. */
  control: string | undefined;
}

const WHITE = '#FFFFFF';
const BLACK = '#000000';

function readable(color: string, against: string, towards: string): string {
  for (let t = 0; t <= 0.7; t += 0.05) {
    const candidate = mix(color, towards, t);
    if (contrast(candidate, against) >= 4) return candidate;
  }
  return mix(color, towards, 0.7);
}

function buildHue(hue: Hue, scheme: Scheme): HueColors {
  const solid = system[hue][scheme];
  const dark = scheme === 'dark';
  return {
    solid,
    onSolid: contrast(solid, WHITE) >= 2.9 ? WHITE : 'rgba(0,0,0,0.82)',
    ink: dark ? readable(solid, '#1C1C1E', WHITE) : readable(solid, '#F2F2F7', BLACK),
    soft: alpha(solid, dark ? 0.3 : 0.2),
    block: alpha(dark ? mix(solid, BLACK, 0.6) : mix(solid, WHITE, 0.78), 0.94),
    control: dark || contrast(solid, WHITE) >= 2.4 ? solid : undefined,
  };
}

const hueTable = Object.fromEntries(
  (['light', 'dark'] as const).map((scheme) => [
    scheme,
    Object.fromEntries(hues.map((h) => [h, buildHue(h, scheme)])) as Record<Hue, HueColors>,
  ]),
) as Record<Scheme, Record<Hue, HueColors>>;

/**
 * Nine colors for a 3×3 mesh. Light rooms are airy washes with the hue strongest in
 * the top-right corner; dark rooms glow out of black. `null` is the calm neutral room
 * shown while nothing runs.
 */
export function meshColors(hue: Hue | null, scheme: Scheme): string[] {
  if (hue === null) {
    return scheme === 'light'
      ? ['#E4E8F4', '#F3F1F7', '#E9E3F0', '#F2F4F9', '#FBFAFC', '#F3EEF1', '#EAEFF3', '#F6F3F4', '#E6E5F0']
      : ['#101116', '#08080A', '#17181D', '#0A0A0C', '#040405', '#0F1014', '#121318', '#060607', '#0E0F13'];
  }
  const c = system[hue][scheme];
  const [n1, n2] = neighbours[hue].map((h) => system[h][scheme]);
  if (scheme === 'light') {
    return [
      mix(n1, WHITE, 0.58),
      mix(c, WHITE, 0.64),
      mix(c, WHITE, 0.3),
      mix(c, WHITE, 0.74),
      mix(c, WHITE, 0.88),
      mix(n2, WHITE, 0.62),
      mix(c, WHITE, 0.5),
      mix(n1, WHITE, 0.82),
      mix(c, WHITE, 0.76),
    ];
  }
  return [
    mix(c, BLACK, 0.58),
    mix(n1, BLACK, 0.74),
    mix(c, BLACK, 0.34),
    mix(n2, BLACK, 0.82),
    mix(c, BLACK, 0.86),
    mix(c, BLACK, 0.7),
    mix(c, BLACK, 0.8),
    BLACK,
    mix(n1, BLACK, 0.76),
  ];
}

export interface Theme {
  scheme: Scheme;
  dark: boolean;
  label: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  separator: string;
  /** systemFill: neutral backgrounds for controls. */
  fill: string;
  /** Opaque-ish row background for grouped lists on top of the mesh. */
  row: string;
  /** Grouped cards and fields inside sheets, where glass on glass would refract. */
  card: string;
  destructive: string;
  /** Tint for plain actions (Undo, links). */
  accent: string;
  hue: (h: Hue) => HueColors;
}

const themes: Record<Scheme, Theme> = {
  light: {
    scheme: 'light',
    dark: false,
    label: '#000000',
    secondary: 'rgba(60,60,67,0.6)',
    tertiary: 'rgba(60,60,67,0.3)',
    quaternary: 'rgba(60,60,67,0.18)',
    separator: 'rgba(60,60,67,0.18)',
    fill: 'rgba(120,120,128,0.16)',
    row: 'rgba(255,255,255,0.72)',
    card: 'rgba(255,255,255,0.62)',
    destructive: system.red.light,
    accent: system.blue.light,
    hue: (h) => hueTable.light[h],
  },
  dark: {
    scheme: 'dark',
    dark: true,
    label: '#FFFFFF',
    secondary: 'rgba(235,235,245,0.6)',
    tertiary: 'rgba(235,235,245,0.3)',
    quaternary: 'rgba(235,235,245,0.16)',
    separator: 'rgba(84,84,88,0.5)',
    fill: 'rgba(120,120,128,0.32)',
    row: 'rgba(44,44,46,0.62)',
    card: 'rgba(118,118,128,0.2)',
    destructive: system.red.dark,
    accent: system.blue.dark,
    hue: (h) => hueTable.dark[h],
  },
};

/** The theme for the current appearance. */
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Rounded, tabular digits for timers and durations. */
export const numeric = { fontFamily: 'ui-rounded', fontVariant: ['tabular-nums' as const] };
