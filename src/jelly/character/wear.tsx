// Neckwear and coats. Neckwear sits under the mouth; coats (surface patterns) are drawn
// inside the body outline, under the gloss, and keep clear of the face so it stays
// readable. Pattern positions are seeded per context, so they never shuffle.

import { BlurMask, Circle, DashPathEffect, Group, LinearGradient, Oval, Path, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { hashSeed, random } from '../geometry';
import { alpha, mix } from '../theme';
import type { BodyGeo } from './bodies';
import type { Lod } from './face';
import { CandyPath, gold, type Tones, white } from './paint';
import type { Neck, Surface } from './traits';

interface NeckProps {
  neck: Neck;
  geo: BodyGeo;
  accent: Tones;
  lod: Lod;
}

/** A band hugging the body at height `y`: the swollen outline clipped to a stripe. */
function useBand(geo: BodyGeo, y: number, k: number) {
  return useMemo(() => geo.path.copy().transform(Skia.Matrix([k, 0, geo.face.x * (1 - k), 0, k, y * (1 - k), 0, 0, 1])), [geo, y, k]);
}

function Band({ geo, y, thickness, tones, stripes }: { geo: BodyGeo; y: number; thickness: number; tones: Tones; stripes?: boolean }) {
  const clip = useBand(geo, y, 1.05);
  const curve = `M ${geo.left - 4} ${y - 1.2} Q ${geo.face.x} ${y + 3.4} ${geo.right + 4} ${y - 1.2}`;
  return (
    <Group clip={clip}>
      <Path path={curve} style="stroke" strokeWidth={thickness}>
        <LinearGradient start={vec(0, y - thickness / 2)} end={vec(0, y + thickness / 2 + 2)} colors={[tones.light, tones.fill, tones.deep]} />
      </Path>
      {stripes && (
        <Path path={curve} style="stroke" strokeWidth={thickness} color="rgba(255,255,255,0.4)">
          <DashPathEffect intervals={[2.2, 3.6]} />
        </Path>
      )}
    </Group>
  );
}

/** Neckwear, in unit space. */
export function NeckPart({ neck, geo, accent, lod }: NeckProps) {
  const x = geo.face.x;
  const y = geo.neck.y;
  // Squat bodies have little room under the mouth, so their neckwear shrinks.
  const s = Math.min(1, Math.max(0.72, geo.neck.w / 56)) * geo.face.s * Math.min(1.3, Math.max(0.75, geo.neck.room / 11));
  switch (neck) {
    case 'none':
      return null;
    case 'bowtie':
      return (
        <Group transform={[{ translateX: x }, { translateY: y }, { scale: s }]}>
          <CandyPath path="M -1.5 0 L -8.6 -4.8 Q -10.4 -5.6 -10.4 -3.6 L -10.4 3.6 Q -10.4 5.6 -8.6 4.8 Z" tones={accent} top={-5.6} bottom={5.6} />
          <CandyPath path="M 1.5 0 L 8.6 -4.8 Q 10.4 -5.6 10.4 -3.6 L 10.4 3.6 Q 10.4 5.6 8.6 4.8 Z" tones={accent} top={-5.6} bottom={5.6} />
          <RoundedRect x={-2.6} y={-2.9} width={5.2} height={5.8} r={1.8}>
            <LinearGradient start={vec(0, -3)} end={vec(0, 3)} colors={[accent.fill, accent.deep]} />
          </RoundedRect>
        </Group>
      );
    case 'tie': {
      const blade = 'M -2 2.2 L 2 2.2 L 3.9 12.4 L 0 16.2 L -3.9 12.4 Z';
      return (
        <Group clip={geo.path}>
          <Group transform={[{ translateX: x }, { translateY: y - 2.4 }, { scale: s }]}>
            <CandyPath path={blade} tones={accent} top={2} bottom={16} />
            {lod > 0 && (
              <Group clip={blade}>
                <Path path="M -5 6 L 5 3 M -5 10.5 L 5 7.5 M -5 15 L 5 12" style="stroke" strokeWidth={1.3} color="rgba(255,255,255,0.4)" />
              </Group>
            )}
            <CandyPath path="M -3 -2.2 L 3 -2.2 L 2.1 2.4 L -2.1 2.4 Z" tones={accent} top={-2.2} bottom={2.4} inner={false} />
          </Group>
        </Group>
      );
    }
    case 'scarf':
      return (
        <>
          <Band geo={geo} y={y} thickness={6.6} tones={accent} stripes={lod > 0} />
          <Group transform={[{ translateX: x + geo.neck.w * 0.2 }, { translateY: y + 1 }, { rotate: -0.14 }, { scale: s }]}>
            <Group clip={Skia.XYWHRect(-3.4, -1, 6.8, 13)}>
              <CandyPath path="M -3.2 0 L 3.2 0 L 3.2 10.4 Q 3.2 11.8 1.8 11.8 L -1.8 11.8 Q -3.2 11.8 -3.2 10.4 Z" tones={accent} top={0} bottom={12} />
              {lod > 0 && (
                <Path path="M 0 0 L 0 12" style="stroke" strokeWidth={6.4} color="rgba(255,255,255,0.4)">
                  <DashPathEffect intervals={[2.2, 3.6]} />
                </Path>
              )}
            </Group>
          </Group>
        </>
      );
    case 'collar':
      return (
        <>
          <Band geo={geo} y={y - 1} thickness={3.4} tones={accent} />
          <Group transform={[{ translateX: x }, { translateY: y + 1.2 }, { scale: s }]}>
            <Circle cx={0} cy={0.6} r={1.3} style="stroke" strokeWidth={0.8} color={gold.deep} />
            <CandyPath path="M 0 1.4 A 3.1 3.1 0 1 1 0 7.6 A 3.1 3.1 0 1 1 0 1.4 Z" tones={gold} top={1.4} bottom={7.6} />
            {lod > 0 && <Circle cx={-1} cy={3.6} r={0.8} color="rgba(255,255,255,0.85)" />}
          </Group>
        </>
      );
    case 'bib':
      return (
        <Group clip={geo.path}>
          <Group transform={[{ translateX: x }, { translateY: y - 0.6 }, { scale: s }]}>
            <CandyPath path="M -11 -2 Q 0 1.2 11 -2 Q 11 9.6 0 10.4 Q -11 9.6 -11 -2 Z" tones={white} top={-2} bottom={10} inner={false} />
            {lod > 0 && <Path path="M -11 -2 Q -11 9.6 0 10.4 Q 11 9.6 11 -2" style="stroke" strokeWidth={1.3} color={accent.fill} />}
            {lod > 1 && (
              <>
                <Circle cx={-4.6} cy={3.4} r={1} color={alpha(accent.fill, 0.8)} />
                <Circle cx={0} cy={5.6} r={1} color={alpha(accent.fill, 0.8)} />
                <Circle cx={4.6} cy={3.4} r={1} color={alpha(accent.fill, 0.8)} />
              </>
            )}
          </Group>
        </Group>
      );
    case 'medal':
      return (
        <Group transform={[{ translateX: x }, { translateY: y - 2.6 }, { scale: s * 0.8 }]}>
          <Path path="M -6.4 -2 L -1.4 6 L 1.6 6 L -3.4 -2 Z" color={accent.fill} />
          <Path path="M 6.4 -2 L 1.4 6 L -1.6 6 L 3.4 -2 Z" color={accent.deep} />
          <CandyPath path="M 0 4.4 A 4.6 4.6 0 1 1 0 13.6 A 4.6 4.6 0 1 1 0 4.4 Z" tones={gold} top={4.4} bottom={13.6} />
          {lod > 0 && (
            <Path
              path="M 0 6.3 L 0.8 8.2 L 2.8 8.3 L 1.2 9.5 L 1.8 11.5 L 0 10.3 L -1.8 11.5 L -1.2 9.5 L -2.8 8.3 L -0.8 8.2 Z"
              color={gold.light}
            />
          )}
        </Group>
      );
  }
}

const SPRINKLES = ['#FFFFFF', '#FFE066', '#FF7AB8', '#5CD2FF', '#9BEA6A', '#B98CFF', '#FF9E4F'];
const SPARKLE = 'M 0 -1 Q 0.16 -0.16 1 0 Q 0.16 0.16 0 1 Q -0.16 0.16 -1 0 Q -0.16 -0.16 0 -1 Z';

interface Spot {
  x: number;
  y: number;
  r: number;
  turn: number;
  color: string;
  opacity: number;
}

/**
 * Seeded spots inside the body, `count` at most, keeping `gap` apart and clear of the face
 * (an ellipse `faceRx` × `faceRy` around it).
 */
function scatter(geo: BodyGeo, seed: string, count: number, gap: number, faceRx: number, faceRy: number, size: [number, number]): Spot[] {
  // Hit-testing hundreds of candidates is the costly part, so results are shared.
  const cached = spotCache.get(geo) ?? new Map<string, Spot[]>();
  spotCache.set(geo, cached);
  const key = `${seed}:${count}:${gap}:${size.join(',')}`;
  const hit = cached.get(key);
  if (hit) return hit;
  const next = random(hashSeed(`coat:${seed}`));
  const out: Spot[] = [];
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
  cached.set(key, out);
  return out;
}

const spotCache = new WeakMap<BodyGeo, Map<string, Spot[]>>();

interface CoatProps {
  surface: Surface;
  geo: BodyGeo;
  tones: Tones;
  seed: string;
  lod: Lod;
}

/** The coat: a pattern inside the body outline. Freckles live on the face instead. */
export function CoatPart({ surface, geo, tones, seed, lod }: CoatProps) {
  const spots = useMemo(() => {
    switch (surface) {
      case 'sprinkles':
        return lod === 0 ? [] : scatter(geo, seed, lod > 1 ? 16 : 10, 6.5, 25, 15, [0, 0]).filter((s) => s.color !== tones.fill);
      case 'spots':
        return scatter(geo, seed, lod === 0 ? 3 : 5, 13, 21, 12, [3.6, 6.4]);
      case 'sugar':
        return lod === 0 ? [] : scatter(geo, seed, lod > 1 ? 60 : 32, 2.6, 20, 8, [0.45, 0.8]);
      case 'sparkle':
        return scatter(geo, seed, lod === 0 ? 1 : 3, 16, 26, 14, [2.8, 4.4]);
      default:
        return [];
    }
  }, [surface, geo, seed, lod, tones.fill]);

  switch (surface) {
    case 'plain':
    case 'freckles':
      return null;
    case 'sprinkles':
      return (
        <>
          {spots.map((s, i) => (
            <Group key={i} transform={[{ translateX: s.x }, { translateY: s.y }, { rotate: s.turn }]}>
              <RoundedRect x={-0.95} y={-2.7} width={1.9} height={5.4} r={0.95} color={s.color} />
            </Group>
          ))}
        </>
      );
    case 'spots':
      return (
        <>
          {spots.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={alpha(mix(tones.fill, '#FFFFFF', 0.5), 0.75)} />
          ))}
        </>
      );
    case 'stripes':
      return (
        <Group transform={[{ translateX: 50 }, { translateY: 60 }, { rotate: -0.55 }]}>
          {Array.from({ length: 11 }, (_, i) => (
            <Rect key={i} x={-66 + i * 12} y={-60} width={lod === 0 ? 6 : 5} height={120} color="rgba(255,255,255,0.24)" />
          ))}
        </Group>
      );
    case 'sugar':
      return (
        <>
          {spots.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={`rgba(255,255,255,${s.opacity.toFixed(2)})`} />
          ))}
        </>
      );
    case 'belly': {
      const h = geo.bottom - geo.top;
      return (
        <Oval x={geo.face.x - geo.neck.w * 0.36} y={geo.bottom - h * 0.42} width={geo.neck.w * 0.72} height={h * 0.4} color={alpha(tones.light, 0.6)}>
          <BlurMask blur={1.4} style="normal" />
        </Oval>
      );
    }
    case 'sparkle':
      return (
        <>
          {spots.map((s, i) => (
            <Group key={i} transform={[{ translateX: s.x }, { translateY: s.y }, { scale: s.r }]}>
              <Path path={SPARKLE} color="rgba(255,255,255,0.95)" />
            </Group>
          ))}
        </>
      );
  }
}
