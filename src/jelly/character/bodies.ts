// Body archetypes. Every body lives in a 100 × 100 unit box and sits on a floor at
// y = 90, leaving the top for hats and ears. Anchors (where the face, hats, ears, cups and
// neckwear go) are measured from the outline, so parts fit every body and every seeded
// variation of it.

import { Skia, type SkPath } from '@shopify/react-native-skia';

import { closedSpline, hashSeed, random } from '../geometry';
import type { Body } from './traits';

export const UNIT = 100;
export const FLOOR = 90;

/** A body's outline and the anchors other parts attach to, in unit space. */
export interface BodyGeo {
  path: SkPath;
  left: number;
  right: number;
  /** The highest point of the outline. */
  top: number;
  bottom: number;
  /** Face centre and scale (1 = the standard face). */
  face: { x: number; y: number; s: number };
  /** Where hats sit: the highest point where the head is wide enough, and that width. */
  crown: { x: number; y: number; w: number };
  /** Right ear root; mirror dx for the left. `lean` is the outward tilt in degrees. */
  ear: { dx: number; y: number; lean: number };
  /** Right side at eye height, for headphone cups and floppy ears. */
  side: { dx: number; y: number };
  /** Where neckwear sits, how wide the body is there and how much room it has below the mouth. */
  neck: { y: number; w: number; room: number };
  /** The glossy highlight: centre, rotation in degrees and length. */
  gloss: { x: number; y: number; angle: number; w: number };
  /** A small round glint near the left edge. */
  glint: { x: number; y: number };
}

interface Def {
  path: (seed: string) => SkPath;
  face: { x: number; y: number; s: number };
  /** Asymmetric bodies may be mirrored per seed. */
  mirror?: boolean;
}

function svg(d: string): SkPath {
  const path = Skia.Path.MakeFromSVGString(d);
  if (!path) throw new Error(`Bad body path: ${d}`);
  return path;
}

/** A polygon with rounded corners; `radii` per vertex. */
function roundedPolygon(points: [number, number][], radii: number[]): SkPath {
  const b = Skia.PathBuilder.Make();
  const n = points.length;
  const [ax, ay] = points[n - 1];
  const [bx, by] = points[0];
  b.moveTo((ax + bx) / 2, (ay + by) / 2);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    b.arcToTangent(x1, y1, x2, y2, radii[i]);
  }
  b.close();
  return b.detach();
}

function ghostPath(): SkPath {
  const b = Skia.PathBuilder.Make();
  const left = 17;
  const right = 83;
  const hemTop = 83;
  b.moveTo(left, 54);
  b.cubicTo(left, 35, 32, 21, 50, 21);
  b.cubicTo(68, 21, right, 35, right, 54);
  b.cubicTo(right, 66, right + 1.5, 76, right + 1.5, hemTop);
  const scallops = 3;
  const span = (right + 1.5 - (left - 1.5)) / scallops;
  for (let i = 0; i < scallops; i++) {
    const xa = right + 1.5 - i * span;
    const xb = xa - span;
    b.cubicTo(xa, FLOOR + 2.4, xb, FLOOR + 2.4, xb, hemTop);
  }
  b.cubicTo(left - 1.5, 76, left, 66, left, 54);
  b.close();
  return b.detach();
}

function starPath(): SkPath {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? 50 : 27;
    points.push([50 + Math.cos(angle) * r, 55 + Math.sin(angle) * r]);
  }
  return roundedPolygon(
    points,
    points.map((_, i) => (i % 2 === 0 ? 7.5 : 6)),
  );
}

const defs: Record<Body, Def> = {
  blob: {
    path: (seed) => blobPath(seed),
    face: { x: 50, y: 61.5, s: 1.12 },
  },
  gumdrop: {
    path: () => svg('M 22 90 C 12 90 9 84 10.5 75 C 13 55 27 27 50 27 C 73 27 87 55 89.5 75 C 91 84 88 90 78 90 Z'),
    face: { x: 50, y: 65, s: 1.06 },
  },
  drop: {
    path: () => svg('M 53 11 C 55 27 85 40 85 63 C 85 79 70 90 50 90 C 30 90 15 79 15 63 C 15 42 43 30 53 11 Z'),
    face: { x: 50, y: 65, s: 1.06 },
    mirror: true,
  },
  bean: {
    path: () =>
      svg('M 12 65 C 12 49 24 40.5 37 41.5 C 43 42 46 45 50 45 C 54 45 57 42 63 41.5 C 76 40.5 88 49 88 65 C 88 81 72 90 50 90 C 28 90 12 81 12 65 Z'),
    face: { x: 50, y: 67, s: 1.06 },
  },
  mochi: {
    path: () => svg('M 21 90 C 12.5 90 9 85 9 78 C 9 58.5 28.5 44 50 44 C 71.5 44 91 58.5 91 78 C 91 85 87.5 90 79 90 Z'),
    face: { x: 50, y: 69, s: 1 },
  },
  capsule: {
    path: () => Skia.Path.RRect(Skia.RRectXY(Skia.XYWHRect(23, 20, 54, 70), 27, 27)),
    face: { x: 50, y: 55, s: 1 },
  },
  onigiri: {
    path: () =>
      roundedPolygon(
        [
          [50, 6],
          [95, 90],
          [5, 90],
        ],
        [14, 16, 16],
      ),
    face: { x: 50, y: 64, s: 1 },
  },
  star: {
    path: () => starPath(),
    face: { x: 50, y: 58, s: 0.9 },
  },
  ghost: {
    path: () => ghostPath(),
    face: { x: 50, y: 52, s: 1.06 },
  },
};

/** The classic lumpy gummy: a squircle, a little wider at the bottom, seeded lumps. */
function blobPath(seed: string): SkPath {
  const next = random(hashSeed(`lumps:${seed}`));
  const count = 12;
  const raw = Array.from({ length: count }, () => next() * 2 - 1);
  const wobble = raw.map((v, i) => (raw[(i + count - 1) % count] + 2 * v + raw[(i + 1) % count]) / 4);
  const exponent = 2.6;
  const cx = 50;
  const cy = 61;
  const rx = 37;
  const ry = 30;
  return closedSpline(
    wobble.map((w, i) => {
      const theta = -Math.PI / 2 + (2 * Math.PI * i) / count;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const k = 1 + w * 0.05;
      const ux = Math.sign(c) * Math.pow(Math.abs(c), 2 / exponent);
      let uy = Math.sign(s) * Math.pow(Math.abs(s), 2 / exponent);
      const pear = 1 + 0.07 * uy;
      if (uy > 0) uy *= 0.95;
      return { x: cx + ux * rx * k * pear, y: cy + uy * ry * k };
    }),
  );
}

/** Distance from (x, y) along `deg` to the outline. Assumes the body is star-shaped around (x, y). */
function reach(path: SkPath, x: number, y: number, deg: number): number {
  const dx = Math.cos((deg * Math.PI) / 180);
  const dy = Math.sin((deg * Math.PI) / 180);
  let lo = 0;
  let hi = 80;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (path.contains(x + dx * mid, y + dy * mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function edge(path: SkPath, x: number, y: number, deg: number) {
  const r = reach(path, x, y, deg);
  const rad = (deg * Math.PI) / 180;
  return { x: x + Math.cos(rad) * r, y: y + Math.sin(rad) * r };
}

const widthAt = (path: SkPath, x: number, y: number) =>
  path.contains(x, y) ? reach(path, x, y, 0) + reach(path, x, y, 180) : 0;

/** The body's width at height `y` through the face's centre line (0 outside the body). */
export const widthOf = (geo: BodyGeo, y: number) => widthAt(geo.path, geo.face.x, y);

function measure(path: SkPath, face: Def['face']): BodyGeo {
  const bounds = path.computeTightBounds();
  const top = bounds.y;
  const bottom = bounds.y + bounds.height;
  const cx = face.x;

  // Hats sit where the head first gets wide enough to hold one.
  let crownY = top + 0.5;
  while (crownY < face.y && widthAt(path, cx, crownY) < 22) crownY += 0.5;

  const ear = edge(path, cx, face.y, -90 + 42);
  const before = edge(path, cx, face.y, -90 + 38);
  const after = edge(path, cx, face.y, -90 + 46);
  // The outline's tangent there, turned outward.
  const lean = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;

  const sideY = face.y - 3 * face.s;
  const neckY = Math.min(face.y + 17.5 * face.s, bottom - 8);
  const centreY = (top + bottom) / 2 + 4;
  const glossAt = edge(path, cx, centreY, -128);
  const glossX = cx + (glossAt.x - cx) * 0.66;
  const glossY = centreY + (glossAt.y - centreY) * 0.66;
  const g1 = edge(path, cx, centreY, -134);
  const g2 = edge(path, cx, centreY, -122);
  const g3 = edge(path, cx, centreY, -166);

  return {
    path,
    left: bounds.x,
    right: bounds.x + bounds.width,
    top,
    bottom,
    face,
    crown: { x: cx, y: crownY, w: widthAt(path, cx, crownY + 5) },
    ear: { dx: ear.x - cx, y: ear.y, lean },
    side: { dx: reach(path, cx, sideY, 0), y: sideY },
    neck: { y: neckY, w: widthAt(path, cx, neckY), room: bottom - (face.y + 15 * face.s) },
    gloss: {
      x: glossX,
      y: glossY,
      angle: (Math.atan2(g2.y - g1.y, g2.x - g1.x) * 180) / Math.PI,
      w: Math.min(26, bounds.width * 0.34),
    },
    glint: { x: cx + (g3.x - cx) * 0.82, y: centreY + (g3.y - centreY) * 0.82 },
  };
}

const cache = new Map<string, BodyGeo>();

/**
 * The outline and anchors of `body` for `seed` (a context id). Each seed stretches the
 * body a little and may mirror it, so two jellies with the same body still differ.
 */
export function bodyGeo(body: Body, seed: string): BodyGeo {
  const key = `${body}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = defs[body];
  const next = random(hashSeed(`shape:${seed}`));
  const sx = 0.95 + next() * 0.1;
  const sy = 0.94 + next() * 0.1;
  const flip = def.mirror && next() < 0.5 ? -1 : 1;
  const path = def.path(seed);
  // Settle every body on the floor before stretching it around its foot.
  const raw = path.computeTightBounds();
  path.offset(0, FLOOR - (raw.y + raw.height));
  path.transform(Skia.Matrix([sx * flip, 0, 50 - 50 * sx * flip, 0, sy, FLOOR - FLOOR * sy, 0, 0, 1]));
  const face = { x: def.face.x, y: FLOOR - (FLOOR - def.face.y) * sy, s: def.face.s };
  const geo = measure(path, face);
  if (cache.size > 400) cache.clear();
  cache.set(key, geo);
  return geo;
}
