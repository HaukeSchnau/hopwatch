// Deck's look: a warm aluminium body, an amber LCD, and keycaps in a Teenage
// Engineering-like palette. Everything visual reads from here.

import type { Hue } from '@/core';

/** Printed aluminium body and ink. */
export const body = {
  top: '#E4E0D8',
  base: '#D9D5CC',
  bottom: '#CDC9C0',
  ink: '#1C1B19',
  ink2: '#5F5B54',
  ink3: '#8C877E',
  groove: 'rgba(0,0,0,0.13)',
  grooveLight: 'rgba(255,255,255,0.55)',
  accent: '#FF5B00',
};

/** The display: black glass with amber pixels. */
export const lcd = {
  bezel: '#1B1A18',
  glass: '#0F0E0D',
  ink: '#FFA548',
  hot: '#FFD6A3',
  dim: 'rgba(255,165,72,0.5)',
  faint: 'rgba(255,165,72,0.22)',
  ghost: 'rgba(255,165,72,0.07)',
  glow: '#FF7A1A',
  line: 'rgba(255,165,72,0.16)',
};

export const led = {
  on: '#FF3B1F',
  core: '#FFB199',
  off: '#9A948A',
};

/** Keycap colors per hue: TE-ish signal orange, lemon, mint, cobalt, graphite… */
export const capColor: Record<Hue, string> = {
  red: '#E4402F',
  orange: '#FF5B00',
  amber: '#F5C21B',
  lime: '#AACC3A',
  green: '#63C596',
  teal: '#1E9A8A',
  cyan: '#5CC2E2',
  blue: '#2B57D8',
  indigo: '#3E3AA6',
  violet: '#8B5AD8',
  pink: '#F28BB0',
  gray: '#3A3937',
};

/** Colors for data drawn on the dark display, tuned to glow on black. */
export const screenColor: Record<Hue, string> = {
  red: '#FF5A48',
  orange: '#FF7A2A',
  amber: '#FFCC3A',
  lime: '#C3E356',
  green: '#6EE0A8',
  teal: '#35C9B6',
  cyan: '#6AD7F5',
  blue: '#5B8BFF',
  indigo: '#8480FF',
  violet: '#B488FF',
  pink: '#FF9CC4',
  gray: '#B8B4AC',
};

/** Names printed next to color keys. */
export const hueName: Record<Hue, string> = {
  red: 'SIGNAL',
  orange: 'ORANGE',
  amber: 'LEMON',
  lime: 'LIME',
  green: 'MINT',
  teal: 'TEAL',
  cyan: 'SKY',
  blue: 'COBALT',
  indigo: 'INDIGO',
  violet: 'VIOLET',
  pink: 'PINK',
  gray: 'GRAPHITE',
};

export const capNeutral = '#EDEAE3';
export const capDark = '#2F2E2C';

export const font = {
  dot: 'Doto_800ExtraBold',
  dotBlack: 'Doto_900Black',
  mono: 'MartianMono_400Regular',
  monoMedium: 'MartianMono_500Medium',
  monoBold: 'MartianMono_700Bold',
};

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (rgb: [number, number, number]) =>
  `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Mixes `hex` towards black (negative amount) or white (positive), -1…1. */
export function shade(hex: string, amount: number): string {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return toHex(parseHex(hex).map((v) => v + (target - v) * t) as [number, number, number]);
}

/** Legend color that reads on a cap of the given color. */
export function legendOn(hex: string): string {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.36 ? '#1C1B19' : '#F7F4EE';
}

export const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};
