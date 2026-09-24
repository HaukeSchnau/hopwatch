// Orbit's visual system: a night-black sky, neon hues that glow, hairline blue-grey
// structure. Unbounded for display, Sora for text, JetBrains Mono for digits and
// small wide-tracked labels.

import type { Hue } from '@/core';

export const sky = {
  bg: '#07080C',
  /** Sheets and raised panels. */
  panel: '#0D0F16',
  panelHi: '#141824',
  hairline: 'rgba(160,178,230,0.12)',
  hairlineHi: 'rgba(160,178,230,0.22)',
  track: '#161B29',
  tick: '#2B3350',
  text: '#E8ECFF',
  dim: '#949DBA',
  faint: '#5A6380',
  accent: '#7CF6D4',
  warn: '#FFC247',
  danger: '#FF5A6E',
} as const;

/** The neon palette every hue key maps onto. Tuned to glow on #07080C. */
export const neon: Record<Hue, string> = {
  red: '#FF5A6E',
  orange: '#FF8A4C',
  amber: '#FFC247',
  lime: '#B6F24A',
  green: '#3BEA8C',
  teal: '#2EE6C8',
  cyan: '#43D6FF',
  blue: '#5B8CFF',
  indigo: '#8A84FF',
  violet: '#BC7CFF',
  pink: '#FF6FB5',
  gray: '#A3ACC4',
};

/** `#RRGGBB` plus an alpha between 0 and 1, as `#RRGGBBAA`. */
export function alpha(hex: string, a: number): string {
  const byte = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return `${hex}${byte.toString(16).padStart(2, '0')}`;
}

export const font = {
  display: 'Unbounded_600SemiBold',
  displayLight: 'Unbounded_400Regular',
  text: 'Sora_400Regular',
  textMedium: 'Sora_500Medium',
  textBold: 'Sora_600SemiBold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/** Small caps-style label: mono, wide tracking. */
export const label = {
  fontFamily: font.mono,
  fontSize: 10.5,
  letterSpacing: 1.6,
  color: sky.dim,
  textTransform: 'uppercase',
} as const;
