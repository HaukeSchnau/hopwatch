// The Week tab (and its Day range): totals, bubbles, target jars, the totals tree and
// the bead strings. The week summary keeps its own strings.

import { localized } from '.';

export const weekText = localized({
  en: {
    ranges: { day: 'Day', week: 'Week' },
    trackedWeek: 'tracked this week',
    trackedDay: 'tracked this day',
    jars: 'Target jars',
    beadsPerDay: 'Beads per day',
    beadsLegend: 'One bead per block, sized by its length · blocks · median',
    beads: 'Beads',
    noBlocks: 'No blocks this day.',
    blocks: (count: number, median: string) => `${count} ${count === 1 ? 'block' : 'blocks'} · median ${median}`,
    emptyTitle: 'Nothing tracked here',
    emptyText: 'Time you track shows up as bubbles, jars and beads.',
    totals: 'Totals',
    /** A target jar, read out: "Job: 36:40 of 40:00". */
    jarLabel: (name: string, actual: string, target: string) => `${name}: ${actual} of ${target}`,
    archived: ' (archived)',
    copy: (name: string) => `Copy ${name} totals`,
    copied: (name: string) => `Copied ${name} totals`,
  },
  de: {
    ranges: { day: 'Tag', week: 'Woche' },
    trackedWeek: 'diese Woche erfasst',
    trackedDay: 'an diesem Tag erfasst',
    jars: 'Zielgläser',
    beadsPerDay: 'Perlen pro Tag',
    beadsLegend: 'Eine Perle pro Block, so groß wie er lang ist · Blöcke · Median',
    beads: 'Perlen',
    noBlocks: 'Keine Blöcke an diesem Tag.',
    blocks: (count, median) => `${count} ${count === 1 ? 'Block' : 'Blöcke'} · Median ${median}`,
    emptyTitle: 'Hier ist nichts erfasst',
    emptyText: 'Erfasste Zeit zeigt sich hier als Blasen, Gläser und Perlen.',
    totals: 'Summen',
    jarLabel: (name, actual, target) => `${name}: ${actual} von ${target}`,
    archived: ' (archiviert)',
    copy: (name) => `Summen von ${name} kopieren`,
    copied: (name) => `Summen von ${name} kopiert`,
  },
});
