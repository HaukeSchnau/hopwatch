// Seeded randomness and smooth outlines for the gummies. Body shapes themselves live in
// character/bodies.ts.

import { Skia, type SkPath } from "@shopify/react-native-skia";

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

/** `items[i]` with `i` counted around both ends, for closed outlines. */
export function around<T>(items: readonly T[], i: number): T {
  const n = items.length;
  const item = items[((i % n) + n) % n];

  if (item === undefined) throw new Error("A closed outline needs at least one point");

  return item;
}

/** A closed Catmull-Rom spline through `pts`, as cubic Béziers. */
export function closedSpline(pts: readonly { x: number; y: number }[]): SkPath {
  const b = Skia.PathBuilder.Make();
  const start = around(pts, 0);
  b.moveTo(start.x, start.y);

  for (const [i, p1] of pts.entries()) {
    const p0 = around(pts, i - 1);
    const p2 = around(pts, i + 1);
    const p3 = around(pts, i + 2);
    b.cubicTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }

  b.close();

  return b.build();
}
