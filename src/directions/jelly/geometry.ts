// Shapes for the gummies. Every context gets its own slightly lumpy silhouette, seeded
// by its id, so a blob is recognisable by shape as well as by color.

import { Skia, type SkPath } from '@shopify/react-native-skia';

/** FNV-1a hash of a string, for stable per-context randomness. */
export function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
export function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINTS = 12;

/** Per-point radial wobble in [-1, 1], smoothed so neighbours agree. */
function genes(seed: string): number[] {
  const next = random(hashSeed(seed));
  const raw = Array.from({ length: POINTS }, () => next() * 2 - 1);
  return raw.map((v, i) => (raw[(i + POINTS - 1) % POINTS] + 2 * v + raw[(i + 1) % POINTS]) / 4);
}

export interface BlobBox {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * A squircle-ish gummy centred in `box`: slightly wider at the bottom like a jelly
 * sitting on a plate, with a seeded lumpiness of `lumpiness` (fraction of the radius).
 */
export function gummyPath(seed: string, box: BlobBox, lumpiness = 0.045): SkPath {
  const wobble = genes(seed);
  const exponent = 2.6;
  const pts = wobble.map((w, i) => {
    const theta = -Math.PI / 2 + (2 * Math.PI * i) / POINTS;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const k = 1 + w * lumpiness;
    const ux = Math.sign(c) * Math.pow(Math.abs(c), 2 / exponent);
    let uy = Math.sign(s) * Math.pow(Math.abs(s), 2 / exponent);
    const pear = 1 + 0.07 * uy;
    if (uy > 0) uy *= 0.95;
    return { x: box.cx + ux * box.rx * k * pear, y: box.cy + uy * box.ry * k };
  });
  return closedSpline(pts);
}

/** A closed Catmull-Rom spline through `pts`, as cubic Béziers. */
export function closedSpline(pts: { x: number; y: number }[]): SkPath {
  const b = Skia.PathBuilder.Make();
  const n = pts.length;
  b.moveTo(pts[0].x, pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    b.cubicTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
  b.close();
  return b.build();
}

/** The standard box for a blob drawn in a square canvas of `size`, leaving room for its shadow. */
export function blobBox(size: number): BlobBox {
  return { cx: size / 2, cy: size * 0.47, rx: size * 0.41, ry: size * 0.37 };
}
