// Exports the app's jelly geometry for the website (site/jelly-data.js). Run from the repo root:
//   npx vitest run --config scripts/site-jellies/vitest.config.mts
// Rerun it when the characters change. It exports outlines, anchors, a width profile and
// seeded coat spots per cast member, straight from src/jelly/character (bodies.ts, derive.ts).
import { writeFileSync } from 'node:fs';
import { test } from 'vitest';
import { bodyGeo, widthOf, type BodyGeo } from '../../src/jelly/character/bodies';
import { lookFor } from '../../src/jelly/character/derive';
import { bodies } from '../../src/jelly/character/traits';
import { hashSeed, random } from '../../src/jelly/geometry';

const SPRINKLES = ['#FFFFFF', '#FFE066', '#FF7AB8', '#5CD2FF', '#9BEA6A', '#B98CFF', '#FF9E4F'];
const r2 = (v: number) => Math.round(v * 100) / 100;

// Same as wear.tsx `scatter`.
function scatter(geo: BodyGeo, seed: string, count: number, gap: number, faceRx: number, faceRy: number, size: [number, number]) {
  const next = random(hashSeed(`coat:${seed}`));
  const out: { x: number; y: number; r: number; turn: number; color: string; opacity: number }[] = [];
  const width = geo.right - geo.left;
  const height = geo.bottom - geo.top;
  for (let tries = 0; tries < count * 14 && out.length < count; tries++) {
    const x = geo.left + next() * width;
    const y = geo.top + next() * height;
    const r = size[0] + next() * (size[1] - size[0]);
    const turn = next() * Math.PI;
    const pick = next();
    const opacity = 0.55 + next() * 0.4;
    const fx = (x - geo.face.x) / (faceRx * geo.face.s);
    const fy = (y - geo.face.y - 2) / (faceRy * geo.face.s);
    if (fx * fx + fy * fy < 1) continue;
    if (!geo.path.contains(x, y)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < gap)) continue;
    out.push({ x, y, r, turn, color: SPRINKLES[Math.floor(pick * SPRINKLES.length)], opacity });
  }
  return out.map((s) => [r2(s.x), r2(s.y), r2(s.r), r2(s.turn), s.color, r2(s.opacity)]);
}

// Coat patterns at the app's finest level of detail (wear.tsx CoatPart, lod 2).
const coatArgs: Record<string, [number, number, number, number, [number, number]]> = {
  sprinkles: [16, 6.5, 25, 15, [0, 0]],
  spots: [5, 13, 21, 12, [3.6, 6.4]],
  sugar: [60, 2.6, 20, 8, [0.45, 0.8]],
  sparkle: [3, 16, 26, 14, [2.8, 4.4]],
};

function exportGeo(geo: BodyGeo, seed: string, coats: string[]) {
  const round = <T extends Record<string, number>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r2(v)]));
  const widths: number[] = [];
  for (let y = 0; y <= 100; y += 2) widths.push(Math.round(widthOf(geo, y)));
  return {
    d: geo.path.toSVGString().replace(/(\d+\.\d{2})\d+/g, '$1'),
    left: r2(geo.left), right: r2(geo.right), top: r2(geo.top), bottom: r2(geo.bottom),
    face: round(geo.face), crown: round(geo.crown), ear: round(geo.ear), side: round(geo.side), neck: round(geo.neck),
    gloss: round(geo.gloss), glint: round(geo.glint), widths,
    spots: Object.fromEntries(
      coats.filter((c) => c in coatArgs).map((c) => {
        const [count, gap, rx, ry, size] = coatArgs[c];
        return [c, scatter(geo, seed, count, gap, rx, ry, size)];
      }),
    ),
  };
}

// key: [seed id, emoji, English name for the look, hue]
const cast: Record<string, [string, string, string, string]> = {
  job: ['hopwatch:job:3', '💼', 'Job', 'blue'],
  deep: ['hopwatch:deep:1', '🎧', 'Deep work', 'violet'],
  dog: ['hopwatch:dog:1', '🐕', 'Dog', 'amber'],
  cooking: ['hopwatch:cooking:1', '🍳', 'Cooking', 'orange'],
  meetings: ['hopwatch:switch:3', '🗣️', 'Meetings', 'indigo'],
  timer: ['hopwatch:dial:2', '⏱️', 'Timer', 'teal'],
  goals: ['hopwatch:goal:7', '🏆', 'Goals', 'green'],
  someone: ['hopwatch:someone:0', '🚀', 'Acme', 'pink'],
  ghost: ['hopwatch:ghost:7', '👻', 'Diary', 'gray'],
  espresso: ['hopwatch:ai:1', '☕', 'Espresso run', 'orange'],
  lunch: ['hopwatch:lang:3', '🥪', 'Lunch', 'pink'],
  website: ['hopwatch:lang2:3', '🌐', 'Website', 'cyan'],
  household: ['hopwatch:peek:3', '🏠', 'Household', 'amber'],
  helper: ['hopwatch:text:3', '💬', 'Clients', 'lime'],
  mascot: ['hopwatch:mascot', '', 'Hopwatch', 'pink'],
};

// The app icon's jelly (assets/hopwatch.icon): a pink blob with a curl, big shiny eyes and a smile.
const looks: Record<string, Partial<ReturnType<typeof lookFor>>> = {
  mascot: { body: 'blob', eyes: 'shiny', mouth: 'smile', topper: 'tuft', neck: 'none', surface: 'plain', motion: 'bouncy' },
};

test('export', () => {
  const geos: Record<string, ReturnType<typeof exportGeo>> = {};
  const out: Record<string, unknown> = {};
  for (const [key, [id, glyph, name, hue]] of Object.entries(cast)) {
    const look = { ...lookFor({ id, glyph: glyph || null, name }), ...looks[key] };
    const geoKey = `${look.body}:${id}`;
    geos[geoKey] ??= exportGeo(bodyGeo(look.body, id), id, [look.surface]);
    out[key] = { seed: id, glyph: glyph || null, hue, look, geo: geoKey };
  }
  // Every body for one seed, so "Surprise me" can reroll the body too.
  const rerollSeed = cast.someone[0];
  for (const body of bodies) geos[`${body}:${rerollSeed}`] = exportGeo(bodyGeo(body, rerollSeed), rerollSeed, Object.keys(coatArgs));
  const header = `// Generated by running the app's character code (src/jelly/character/bodies.ts and
// derive.ts) under CanvasKit: body outlines and anchors in the app's 100-unit box, a width
// profile (one value every 2 units of height) and seeded coat spots, plus each website
// jelly's derived look. Regenerate it that way rather than editing by hand. Read by jelly.js.
`;
  writeFileSync(new URL('../../site/jelly-data.js', import.meta.url), `${header}window.JellyData = ${JSON.stringify({ geos, cast: out, rerollSeed })};\n`);
});
