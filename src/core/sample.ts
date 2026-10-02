// Three weeks of plausible sample data, so the timeline and reports can be judged
// before real data exists. Deterministic for a given `now`. Jelly names and notes are in
// the app's language.

import { coreText } from '@/i18n/core';

import type { Context, ContextId, Entry, EntryId, Hue } from './model';
import { addDays, HOUR, MINUTE, startOfDay } from './time';

const { names, notes } = coreText.sample;

interface Seed {
  key: keyof typeof names;
  parent?: keyof typeof names;
  color?: Hue;
  emoji?: string;
  pin?: number;
  target?: number;
  nudge?: number;
  archived?: boolean;
}

const seeds: Seed[] = [
  { key: 'job', color: 'blue', emoji: '💼', pin: 0, target: 40 * 60 },
  { key: 'deep', parent: 'job', emoji: '🎧', pin: 1 },
  { key: 'meetings', parent: 'job', color: 'indigo', emoji: '🗣️', pin: 2 },
  { key: 'clients', color: 'violet', emoji: '🤝' },
  { key: 'acme', parent: 'clients', color: 'orange', emoji: '🚀' },
  { key: 'website', parent: 'acme', emoji: '🌐', pin: 5 },
  { key: 'app', parent: 'acme', color: 'red', emoji: '📱' },
  { key: 'nordlicht', parent: 'clients', color: 'teal', emoji: '🌌' },
  { key: 'side', color: 'green', emoji: '🧪', target: 6 * 60 },
  { key: 'podcast', parent: 'side', color: 'lime', emoji: '🎙️', pin: 6 },
  { key: 'garden', parent: 'side', emoji: '🌱' },
  { key: 'home', color: 'amber', emoji: '🏠' },
  { key: 'dog', parent: 'home', emoji: '🐕', pin: 3, nudge: 60 },
  { key: 'cooking', parent: 'home', color: 'orange', emoji: '🍳', pin: 7 },
  { key: 'groceries', parent: 'home', emoji: '🛒' },
  { key: 'lunch', color: 'pink', emoji: '🥪', pin: 4, nudge: 60 },
  { key: 'sport', color: 'red', emoji: '🏃', pin: 8 },
  { key: 'thesis', color: 'gray', emoji: '🎓', archived: true },
];

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Plan = [key: Seed['key'], minutes: number, gapAfter?: number][];

export function sampleData(
  now: number,
  newId: () => string,
  offsetAt: (ts: number) => number,
): { contexts: Context[]; entries: Entry[] } {
  const random = rng(Math.floor(startOfDay(now) / 86_400_000));
  const between = (min: number, max: number) => Math.round(min + random() * (max - min));
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];

  const ids = new Map(seeds.map((s) => [s.key, newId() as ContextId]));
  const sortOrders = new Map<Seed['key'] | null, number>();
  const contexts: Context[] = seeds.map((s) => {
    const parentKey = s.parent ?? null;
    const sortOrder = sortOrders.get(parentKey) ?? 0;
    sortOrders.set(parentKey, sortOrder + 1);
    return {
      id: ids.get(s.key)!,
      parentId: s.parent ? ids.get(s.parent)! : null,
      name: names[s.key],
      color: s.color ?? null,
      emoji: s.emoji ?? null,
      pinPosition: s.pin ?? null,
      sortOrder,
      weeklyTargetMinutes: s.target ?? null,
      nudgeAfterMinutes: s.nudge ?? null,
      archivedAt: s.archived ? now - 30 * 24 * HOUR : null,
      createdAt: now - 60 * 24 * HOUR,
      updatedAt: now,
      deletedAt: null,
    };
  });

  const workday = (): Plan => {
    const plan: Plan = [['dog', between(22, 38), between(5, 20)]];
    let jobLeft = between(7 * 60, 8 * 60 + 40);
    const morning = between(150, 200);
    plan.push(['meetings', between(15, 30)], ['deep', morning - 30]);
    jobLeft -= morning;
    plan.push(['lunch', between(30, 50)]);
    if (random() < 0.7) plan.push(['dog', between(12, 25)]);
    while (jobLeft > 20) {
      const block = Math.min(jobLeft, between(30, 110));
      plan.push([random() < 0.35 ? 'meetings' : 'deep', block, random() < 0.3 ? between(3, 15) : 0]);
      jobLeft -= block;
    }
    plan.push(['dog', between(25, 45), between(10, 30)], ['cooking', between(25, 50), between(15, 60)]);
    const evening = random();
    if (evening < 0.45) plan.push([pick(['website', 'app', 'nordlicht']), between(50, 130)]);
    else if (evening < 0.75) plan.push(['podcast', between(40, 100)]);
    return plan;
  };

  const weekend = (): Plan => [
    ['dog', between(45, 70), between(30, 90)],
    ['groceries', between(30, 50), between(20, 60)],
    [pick(['podcast', 'garden']), between(70, 150), between(20, 60)],
    ['cooking', between(40, 70), between(10, 40)],
    ['dog', between(30, 50), between(30, 60)],
    random() < 0.6 ? ['sport', between(45, 80), between(20, 50)] : ['garden', between(40, 80), 20],
    ['cooking', between(30, 50), 0],
  ];

  const entries: Entry[] = [];
  const today = startOfDay(now);
  for (let dayIndex = -20; dayIndex <= 0; dayIndex++) {
    const day = addDays(today, dayIndex);
    const weekday = (new Date(day).getDay() + 6) % 7;
    const plan = weekday < 5 ? workday() : weekend();
    let cursor = day + (weekday < 5 ? between(7 * 60 + 15, 8 * 60) : between(8 * 60 + 30, 9 * 60 + 30)) * MINUTE;
    for (const [key, minutes, gapAfter = 0] of plan) {
      if (cursor >= now) break;
      const start = cursor;
      const end = Math.min(start + minutes * MINUTE, now);
      const running = end === now;
      entries.push({
        id: newId() as EntryId,
        contextId: ids.get(key)!,
        startUtc: start,
        startOffsetMinutes: offsetAt(start),
        endUtc: running ? null : end,
        endOffsetMinutes: running ? null : offsetAt(end),
        note: key === 'website' || key === 'app' ? pick([...notes, null]) : null,
        createdAt: start,
        updatedAt: end,
        deletedAt: null,
      });
      if (running) break;
      cursor = end + gapAfter * MINUTE;
    }
  }
  return { contexts, entries };
}
