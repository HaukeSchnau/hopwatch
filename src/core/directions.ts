// The five design directions. They share all data and domain logic in src/core and
// differ only in UI. The active one is stored on the device and picked in the Lab.

export interface DirectionInfo {
  id: string;
  name: string;
  tagline: string;
  /** Background, ink and accent for the Lab's preview card. */
  swatch: { background: string; ink: string; accent: string };
}

export const directions = [
  {
    id: 'jelly',
    name: 'Jelly',
    tagline: 'Candy characters, each one its own someone, living on a 24-hour dial. Native, and Apple Intelligence helps dress them.',
    swatch: { background: '#FFF4E8', ink: '#2B1B3D', accent: '#FF6FB5' },
  },
  {
    id: 'glass',
    name: 'Glass',
    tagline: 'Native iOS with Liquid Glass. The room takes on the color of what you are doing.',
    swatch: { background: '#DCE6FF', ink: '#0B1020', accent: '#3D8BFD' },
  },
  {
    id: 'deck',
    name: 'Deck',
    tagline: 'A pocket instrument. Chunky keys, an LCD and a knob to dial back time.',
    swatch: { background: '#D8D4CC', ink: '#161514', accent: '#FF5B00' },
  },
  {
    id: 'almanac',
    name: 'Almanac',
    tagline: 'Your day, typeset. Serif headlines on paper, printed in risograph ink.',
    swatch: { background: '#F3EDE2', ink: '#1C1A17', accent: '#E4572E' },
  },
  {
    id: 'orbit',
    name: 'Orbit',
    tagline: 'The day as a glowing 24-hour dial. Scrub the ring to change the past.',
    swatch: { background: '#07080C', ink: '#E8ECFF', accent: '#7CF6D4' },
  },
] as const satisfies readonly DirectionInfo[];

export type DirectionId = (typeof directions)[number]['id'];

export const isDirectionId = (value: unknown): value is DirectionId =>
  directions.some((d) => d.id === value);
