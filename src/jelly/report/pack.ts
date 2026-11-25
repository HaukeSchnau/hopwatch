// A small front-chain-free circle packer: places circles largest first, each touching
// two already placed ones as close to the middle as possible. Good for the handful of
// top-level contexts in a report.

export interface Circle {
  x: number;
  y: number;
  r: number;
}

function overlaps(c: Circle, placed: Circle[], gap: number) {
  return placed.some((p) => Math.hypot(p.x - c.x, p.y - c.y) < p.r + c.r + gap - 1e-6);
}

/** Positions of circles touching both `a` and `b` with radius `r`. */
function touching(a: Circle, b: Circle, r: number, gap: number): Circle[] {
  const ra = a.r + r + gap;
  const rb = b.r + r + gap;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);

  if (d === 0 || d > ra + rb || d < Math.abs(ra - rb)) return [];
  const along = (ra * ra - rb * rb + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, ra * ra - along * along));
  const mx = a.x + (dx * along) / d;
  const my = a.y + (dy * along) / d;

  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d, r },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d, r },
  ];
}

/**
 * Packs one circle per item, with areas proportional to `size(item)`, into a `width` × `height`
 * box. Returns each item with its circle, in the input order.
 */
export function pack<T>(
  items: readonly T[],
  size: (item: T) => number,
  width: number,
  height: number,
  gap = 6,
): { item: T; circle: Circle }[] {
  if (items.length === 0) return [];
  const sized = items.map((item) => ({ item, value: size(item) }));
  // Radii normalised so the biggest is 100, which makes `gap` a share of it.
  const max = Math.max(...sized.map((s) => s.value), 1);

  const order = sized
    .map(({ item, value }, i) => ({
      i,
      item,
      r: Math.max(8, Math.sqrt(Math.max(value, 0) / max) * 100),
    }))
    .sort((a, b) => b.r - a.r);

  const placed: { i: number; item: T; circle: Circle }[] = [];
  const circles: Circle[] = [];
  // Squash towards a wide layout by weighting vertical distance more.
  const cost = (c: Circle) => Math.hypot(c.x * 0.8, c.y * 1.5);

  for (const { i, item, r } of order) {
    const [first] = circles;
    let best: Circle | null = null;

    if (!first) best = { x: 0, y: 0, r };
    else if (circles.length === 1) best = { x: first.r + r + gap, y: 0, r };
    else {
      for (const [a, ca] of circles.entries()) {
        for (const cb of circles.slice(a + 1)) {
          for (const c of touching(ca, cb, r, gap)) {
            if (!overlaps(c, circles, gap) && (!best || cost(c) < cost(best))) best = c;
          }
        }
      }

      best ??= { x: 0, y: circles.reduce((m, p) => Math.max(m, p.y + p.r), 0) + r + gap, r };
    }

    placed.push({ i, item, circle: best });
    circles.push(best);
  }

  // Fit into the box.
  const minX = Math.min(...circles.map((c) => c.x - c.r));
  const maxX = Math.max(...circles.map((c) => c.x + c.r));
  const minY = Math.min(...circles.map((c) => c.y - c.r));
  const maxY = Math.max(...circles.map((c) => c.y + c.r));
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;

  return placed
    .sort((a, b) => a.i - b.i)
    .map(({ item, circle: c }) => ({
      item,
      circle: {
        x: (c.x - minX) * scale + offsetX,
        y: (c.y - minY) * scale + offsetY,
        r: c.r * scale,
      },
    }));
}
