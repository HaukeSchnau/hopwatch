// Almanac's design tokens: warm paper, near-black ink, risograph inks for context hues,
// and the type families. Everything visual in the direction reads from here.

import type { Hue } from '@/core';

export const paper = {
  /** The page. */
  sheet: '#F3EDE2',
  /** Slips, cards and pressed states: a shade darker, like a second stock. */
  slip: '#EBE3D4',
  /** Deeper stock for wells and inputs. */
  well: '#E3D9C7',
} as const;

export const ink = {
  /** Body ink, near-black and warm. */
  full: '#1C1A17',
  /** Secondary text. */
  soft: '#5E574D',
  /** Tertiary text, leaders and hints. */
  faint: '#978D7E',
  /** Hairline rules. */
  rule: 'rgba(28, 26, 23, 0.16)',
  /** The editor's red pen: now-lines, destructive links, the masthead accent. */
  red: '#E4572E',
} as const;

export interface RisoInk {
  /** The ink's trade name, shown in the editor. */
  name: string;
  /** Flat fill, printed with multiply. */
  fill: string;
  /** A darker cut of the same ink for type on paper, legible even for yellow. */
  type: string;
  /** Text color on top of a fill. */
  on: string;
}

/** Core hue keys mapped onto risograph drum colors. */
export const riso: Record<Hue, RisoInk> = {
  red: { name: 'Bright Red', fill: '#F15060', type: '#D63A4B', on: ink.full },
  orange: { name: 'Orange', fill: '#FF6C2F', type: '#DD5516', on: ink.full },
  amber: { name: 'Sunflower', fill: '#FFB511', type: '#B07A00', on: ink.full },
  lime: { name: 'Kelly Green', fill: '#67B346', type: '#478C28', on: ink.full },
  green: { name: 'Green', fill: '#00A95C', type: '#008749', on: ink.full },
  teal: { name: 'Teal', fill: '#00838A', type: '#00747A', on: paper.sheet },
  cyan: { name: 'Aqua', fill: '#5EC8E5', type: '#1C8DB0', on: ink.full },
  blue: { name: 'Blue', fill: '#0078BF', type: '#006BAA', on: paper.sheet },
  indigo: { name: 'Federal Blue', fill: '#3D5588', type: '#3D5588', on: paper.sheet },
  violet: { name: 'Purple', fill: '#765BA7', type: '#6A4F9C', on: paper.sheet },
  pink: { name: 'Fluorescent Pink', fill: '#FF48B0', type: '#DE2A8E', on: ink.full },
  gray: { name: 'Granite', fill: '#9A9B98', type: '#6B6C69', on: ink.full },
};

/**
 * The second drum used for misregistration. A riso print overlays two inks slightly
 * off; each hue gets a partner that reads well under multiply.
 */
export const partner: Record<Hue, Hue> = {
  red: 'amber',
  orange: 'pink',
  amber: 'orange',
  lime: 'cyan',
  green: 'amber',
  teal: 'lime',
  cyan: 'blue',
  blue: 'pink',
  indigo: 'cyan',
  violet: 'pink',
  pink: 'amber',
  gray: 'cyan',
};

export const font = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  text: 'Newsreader_400Regular',
  textItalic: 'Newsreader_400Regular_Italic',
  textMedium: 'Newsreader_500Medium',
  sans: 'InterTight_500Medium',
  sansRegular: 'InterTight_400Regular',
  sansBold: 'InterTight_600SemiBold',
} as const;

/** Horizontal page margin. */
export const margin = 20;
