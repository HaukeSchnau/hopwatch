// Things on top: hats, ears, sprouts and friends, drawn in unit space around the body's
// anchors. Ears grow from behind the body (the "back" layer); everything else sits in
// front. Hats scale with the head and shrink when a body leaves little headroom.

import { BlurMask, Circle, DashPathEffect, Group, LinearGradient, Oval, Path, Rect, RoundedRect, Skia, vec } from '@shopify/react-native-skia';
import { type ReactNode, useMemo } from 'react';

import { alpha, mix } from '../theme';
import { type BodyGeo, widthOf } from './bodies';
import type { Lod } from './face';
import { CandyPath, gold, INK, ivory, leaf, plum, type Tones, white } from './paint';
import type { Topper } from './traits';

export interface TopperProps {
  topper: Topper;
  geo: BodyGeo;
  tones: Tones;
  accent: Tones;
  lod: Lod;
  /** One screen point in unit space. */
  px: number;
}

const BACK: ReadonlySet<Topper> = new Set(['catEars', 'bearEars', 'bunnyEars']);

/** Whether `topper` is drawn behind the body. */
export const isBehind = (topper: Topper) => BACK.has(topper);

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Scale for a hat reaching `height` above its base, with the base `sink` below the crown:
 * big enough to read, small enough to stay inside the canvas.
 */
function hatScale(geo: BodyGeo, height: number, sink: number) {
  return Math.min(clamp(geo.crown.w / 36, 0.85, 1.12) * 1.38, (geo.crown.y + sink - 1.5) / height);
}

const PINK_EAR: Tones = { light: '#FFD0E2', fill: '#FFA6C8', deep: '#F07AA8' };

/** Where the forehead is: between the crown and the top of the eyes. */
function forehead(geo: BodyGeo, t: number) {
  const eyesTop = geo.face.y - 7 * geo.face.s;
  return geo.crown.y + (eyesTop - geo.crown.y) * t;
}

/** The body outline blown up around (cx, cy), for bands that wrap around it. */
function useSwollen(geo: BodyGeo, cy: number, k: number) {
  return useMemo(() => geo.path.copy().transform(Skia.Matrix([k, 0, geo.crown.x * (1 - k), 0, k, cy * (1 - k), 0, 0, 1])), [geo, cy, k]);
}

/** The same part on both sides, mirrored: `spread` from the centre, leaning outward. */
function Pair({ geo, children, spread, y, lean, scale = 1 }: { geo: BodyGeo; children: ReactNode; spread: number; y: number; lean: number; scale?: number }) {
  return (
    <>
      {[-1, 1].map((side) => (
        <Group key={side} transform={[{ translateX: geo.crown.x + side * spread }, { translateY: y }, { rotate: rad(side * lean) }, { scaleX: side * scale }, { scaleY: scale }]}>
          {children}
        </Group>
      ))}
    </>
  );
}

function CatEars({ geo, tones, lod }: TopperProps) {
  return (
    <Pair geo={geo} spread={geo.ear.dx * 0.86} y={geo.ear.y + 4} lean={clamp(geo.ear.lean * 0.55, 8, 26)} scale={1.45}>
      <CandyPath path="M -8 5 C -6.4 -2 -3.8 -9 -1.4 -11.4 C -0.5 -12.3 0.9 -12.2 1.7 -11.1 C 4 -8 6.4 -1.5 8 5 Z" tones={tones} top={-12} bottom={6} />
      {lod > 0 && (
        <CandyPath
          path="M -4.4 3 C -3.4 -1.6 -1.8 -6 -0.4 -7.6 C 0.2 -8.2 0.9 -8.1 1.3 -7.4 C 2.6 -5.2 4 -1.2 4.6 3 Z"
          tones={PINK_EAR}
          top={-8}
          bottom={3}
          inner={false}
        />
      )}
    </Pair>
  );
}

function BearEars({ geo, tones, lod }: TopperProps) {
  return (
    <Pair geo={geo} spread={geo.ear.dx * 0.98} y={geo.ear.y + 2} lean={0} scale={1.25}>
      <CandyPath path="M 0 -7 A 7 7 0 1 1 0 7 A 7 7 0 1 1 0 -7 Z" tones={tones} top={-7} bottom={7} />
      {lod > 0 && <Circle cx={0.4} cy={-0.2} r={3.6} color={mix(tones.light, '#FFB9D2', 0.45)} />}
    </Pair>
  );
}

function BunnyEars({ geo, tones, lod }: TopperProps) {
  const s = Math.min(1.3, (geo.crown.y + 4) / 23.4);
  const ear = (side: number, lean: number) => (
    <Group key={side} transform={[{ translateX: geo.crown.x + side * 7.5 * s }, { translateY: geo.crown.y + 5 }, { rotate: rad(side * lean) }, { scale: s }]}>
      <CandyPath path="M -4.8 2 C -5.8 -8 -4.8 -20 0 -22.4 C 4.8 -20 5.8 -8 4.8 2 Z" tones={tones} top={-22} bottom={2} />
      {lod > 0 && <CandyPath path="M -2.2 -1 C -2.8 -8 -2.4 -16 0 -17.8 C 2.4 -16 2.8 -8 2.2 -1 Z" tones={PINK_EAR} top={-18} bottom={-1} inner={false} />}
    </Group>
  );
  return (
    <>
      {ear(-1, 9)}
      {ear(1, 17)}
    </>
  );
}

function DogEars({ geo, tones }: TopperProps) {
  const ear: Tones = { light: tones.fill, fill: tones.deep, deep: mix(tones.deep, INK, 0.35) };
  return (
    <Pair geo={geo} spread={geo.ear.dx * 0.78} y={geo.ear.y + 1.5} lean={clamp(geo.ear.lean * 0.3, 0, 12)} scale={1.2}>
      <CandyPath
        path="M -4 0.5 C -2 -3.6 6.4 -4.4 10.6 1.6 C 14.4 7.2 14.8 16.4 12.6 21.2 C 10.8 25.2 6.2 25 4.4 21.4 C 2.4 17.4 2.6 10.8 -0.6 6.4 C -2.4 4 -5 3 -4 0.5 Z"
        tones={ear}
        top={-3}
        bottom={25}
      />
    </Pair>
  );
}

function Horns({ geo }: TopperProps) {
  return (
    <Pair geo={geo} spread={geo.ear.dx * 0.72} y={geo.ear.y + 4.6} lean={clamp(geo.ear.lean * 0.5, 6, 22)} scale={1.5}>
      <CandyPath path="M -3.7 2 C -3.9 -4 -1.7 -9.6 2.9 -11.6 C 1.6 -7 2.4 -2.4 3.9 2 Z" tones={ivory} top={-11.6} bottom={2} />
    </Pair>
  );
}

function Tuft({ geo, tones, px }: TopperProps) {
  const s = hatScale(geo, 11, 2.6);
  return (
    <Group transform={[{ translateX: geo.crown.x + 1 }, { translateY: geo.crown.y + 2.6 }, { scale: s }]}>
      <Path path="M 0 1 C -0.5 -6 5 -11 9.5 -8.6 C 13 -6.6 10.6 -2 7.4 -3.6" style="stroke" strokeWidth={Math.max(3.4, 1.4 * px)} strokeCap="round">
        <LinearGradient start={vec(0, -11)} end={vec(0, 2)} colors={[tones.fill, tones.deep]} />
      </Path>
    </Group>
  );
}

function Sprout({ geo, lod, px }: TopperProps) {
  const s = hatScale(geo, 17.6, 2.4);
  return (
    <Group transform={[{ translateX: geo.crown.x }, { translateY: geo.crown.y + 2.4 }, { scale: s }]}>
      <Path path="M 0 1.5 C 0 -3 -0.6 -6 0.4 -9.5" style="stroke" strokeWidth={Math.max(2.1, 1.1 * px)} strokeCap="round" color={leaf.deep} />
      <CandyPath path="M 0.2 -8.6 C -3 -14.5 -10.5 -14 -12 -9.8 C -8.4 -6.6 -3 -6.4 0.2 -8.6 Z" tones={leaf} top={-14} bottom={-6} inner={false} />
      <CandyPath path="M 0.6 -9.6 C 3 -16.8 11.6 -17.6 13.6 -12.6 C 10 -8.6 4 -7.8 0.6 -9.6 Z" tones={leaf} top={-17} bottom={-8} inner={false} />
      {lod > 1 && (
        <Path path="M -1 -8.8 Q -5.5 -10.6 -9.6 -10 M 1.8 -9.8 Q 6.6 -12.4 11 -12.6" style="stroke" strokeWidth={0.7} strokeCap="round" color="rgba(255,255,255,0.5)" />
      )}
    </Group>
  );
}

function Flower({ geo, accent, lod }: TopperProps) {
  const s = hatScale(geo, 9, 3.4);
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = rad(i * 72 - 90);
    return [Math.cos(a) * 4.5, Math.sin(a) * 4.5];
  });
  return (
    <Group transform={[{ translateX: geo.crown.x + geo.crown.w * 0.3 }, { translateY: geo.crown.y + 3.4 }, { rotate: 0.3 }, { scale: s }]}>
      {petals.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.8}>
          <LinearGradient start={vec(0, -8)} end={vec(0, 8)} colors={[accent.light, accent.fill]} />
        </Circle>
      ))}
      <Circle cx={0} cy={0} r={3}>
        <LinearGradient start={vec(0, -3)} end={vec(0, 3)} colors={[gold.light, gold.deep]} />
      </Circle>
      {lod > 0 && <Circle cx={-0.9} cy={-1} r={0.9} color="rgba(255,255,255,0.8)" />}
    </Group>
  );
}

function Antenna({ geo, accent, lod, px }: TopperProps) {
  const s = hatScale(geo, 18.6, 2.6);
  return (
    <Group transform={[{ translateX: geo.crown.x }, { translateY: geo.crown.y + 2.6 }, { rotate: 0.12 }, { scale: s }]}>
      <Path path="M 0 1 Q -1.2 -6 1.2 -12.5" style="stroke" strokeWidth={Math.max(1.9, 1.1 * px)} strokeCap="round" color={plum.fill} />
      <CandyPath path="M 1.4 -18.4 A 3.8 3.8 0 1 1 1.4 -10.8 A 3.8 3.8 0 1 1 1.4 -18.4 Z" tones={accent} top={-18.4} bottom={-10.8} />
      {lod > 0 && <Circle cx={0.2} cy={-15.8} r={1.1} color="rgba(255,255,255,0.9)" />}
    </Group>
  );
}

function Bow({ geo, accent, lod }: TopperProps) {
  const s = hatScale(geo, 7, 3.6);
  return (
    <Group transform={[{ translateX: geo.crown.x + geo.crown.w * 0.24 }, { translateY: geo.crown.y + 3.6 }, { rotate: 0.3 }, { scale: s }]}>
      <CandyPath path="M 0 0 C -3 -6.4 -11 -7.4 -11.6 -1.2 C -12 4.6 -4.4 5.4 0 0 Z" tones={accent} top={-6} bottom={4} />
      <CandyPath path="M 0 0 C 3 -6.4 11 -7.4 11.6 -1.2 C 12 4.6 4.4 5.4 0 0 Z" tones={accent} top={-6} bottom={4} />
      {lod > 1 && <Path path="M -2.4 -0.2 Q -6 -1.2 -8.4 -3 M 2.4 -0.2 Q 6 -1.2 8.4 -3" style="stroke" strokeWidth={0.8} strokeCap="round" color="rgba(255,255,255,0.45)" />}
      <RoundedRect x={-2.7} y={-3.1} width={5.4} height={6.2} r={2}>
        <LinearGradient start={vec(0, -3)} end={vec(0, 3)} colors={[accent.fill, accent.deep]} />
      </RoundedRect>
    </Group>
  );
}

function PartyHat({ geo, accent, lod }: TopperProps) {
  const s = hatScale(geo, 26, 4.6);
  const cone = 'M -9 1 L -0.9 -21.4 Q 0 -22.8 0.9 -21.4 L 9 1 Q 0 3.8 -9 1 Z';
  return (
    <Group transform={[{ translateX: geo.crown.x + 2 }, { translateY: geo.crown.y + 4.6 }, { rotate: 0.2 }, { scale: s }]}>
      <CandyPath path={cone} tones={accent} top={-22} bottom={3} />
      {lod > 0 && (
        <Group clip={cone}>
          {[
            [-3, -3.6, 1.7],
            [3.6, -8.6, 1.5],
            [-1, -14, 1.3],
            [4.6, -1.6, 1.4],
            [-5.2, 0.4, 1.2],
          ].map(([x, y, r]) => (
            <Circle key={`${x}${y}`} cx={x} cy={y} r={r} color="rgba(255,255,255,0.85)" />
          ))}
        </Group>
      )}
      {lod > 0 && <Path path="M -9 1 Q 0 3.8 9 1" style="stroke" strokeWidth={1.8} strokeCap="round" color="rgba(255,255,255,0.9)" />}
      <CandyPath path="M 0 -26 A 3.4 3.4 0 1 1 0 -19.2 A 3.4 3.4 0 1 1 0 -26 Z" tones={white} top={-26} bottom={-19} />
    </Group>
  );
}

function ChefHat({ geo, lod }: TopperProps) {
  const s = hatScale(geo, 24.6, 6.4);
  return (
    <Group transform={[{ translateX: geo.crown.x }, { translateY: geo.crown.y + 6.4 }, { scale: s }]}>
      <CandyPath
        path="M -9.5 -6 C -14.8 -6.4 -15.4 -15.2 -9.2 -15.8 C -8.8 -21.8 -2 -24.4 1.4 -20.6 C 5.2 -24.4 12.8 -21.2 11 -15.2 C 16.6 -13.8 14.8 -6.2 9.5 -6 Z"
        tones={white}
        top={-24}
        bottom={-4}
      />
      {lod > 0 && (
        <Path path="M -4 -8.6 Q -3.4 -12.6 -1.2 -15 M 4.2 -9 Q 4.8 -12.2 7 -14" style="stroke" strokeWidth={0.9} strokeCap="round" color={white.deep} />
      )}
      <RoundedRect x={-9.8} y={-7.4} width={19.6} height={8.6} r={2.4}>
        <LinearGradient start={vec(0, -7.4)} end={vec(0, 1.2)} colors={[white.fill, white.deep]} />
      </RoundedRect>
      {lod > 1 && <Path path="M -4.5 -6 L -4.5 -0.4 M 0 -6 L 0 -0.4 M 4.5 -6 L 4.5 -0.4" style="stroke" strokeWidth={0.8} color="rgba(160,140,180,0.45)" />}
    </Group>
  );
}

function Crown({ geo, lod }: TopperProps) {
  const s = hatScale(geo, 14, 4);
  return (
    <Group transform={[{ translateX: geo.crown.x + 1 }, { translateY: geo.crown.y + 4 }, { rotate: -0.12 }, { scale: s }]}>
      <CandyPath
        path="M -10 1.5 L -11.2 -9 Q -11.3 -10 -10.4 -9.4 L -5.6 -4.6 L -0.8 -12.6 Q 0 -13.6 0.8 -12.6 L 5.6 -4.6 L 10.4 -9.4 Q 11.3 -10 11.2 -9 L 10 1.5 Q 0 3.6 -10 1.5 Z"
        tones={gold}
        top={-13}
        bottom={3}
      />
      {lod > 0 && (
        <>
          {[
            [-11.2, -10.2],
            [0, -13.8],
            [11.2, -10.2],
          ].map(([x, y]) => (
            <Circle key={x} cx={x} cy={y} r={1.8} color={gold.light} />
          ))}
          <Oval x={-2} y={-4.8} width={4} height={4.8} color="#FF4F86" />
          <Circle cx={-0.7} cy={-3.6} r={0.7} color="rgba(255,255,255,0.9)" />
        </>
      )}
      {lod > 1 && <Path path="M -10.4 -1.6 Q 0 0.4 10.4 -1.6" style="stroke" strokeWidth={1} color="rgba(190,120,0,0.5)" />}
    </Group>
  );
}

function Headphones({ geo, accent, lod, px }: TopperProps) {
  const x = geo.crown.x;
  const dx = geo.side.dx + 0.6;
  const endY = geo.side.y - 4;
  const peak = Math.max(3, geo.top - 3.4);
  const ctrl = (peak - 0.25 * endY) / 0.75;
  const band = `M ${x - dx} ${endY} C ${x - dx} ${ctrl} ${x + dx} ${ctrl} ${x + dx} ${endY}`;
  return (
    <>
      <Path path={band} style="stroke" strokeWidth={Math.max(4.2, 1.5 * px)} strokeCap="round" color={plum.fill} />
      {lod > 1 && <Path path={band} style="stroke" strokeWidth={1} strokeCap="round" color={plum.light} start={0.15} end={0.5} />}
      {[-1, 1].map((side) => (
        <Group key={side} transform={[{ translateX: x + side * dx }, { translateY: geo.side.y - 1 }, { scaleX: side }]}>
          {lod > 0 && <RoundedRect x={-4.6} y={-6.2} width={4} height={12.4} r={2} color={plum.fill} />}
          <CandyPath path="M -1.6 -7.4 L 1.8 -7.4 Q 6 -7.4 6 -3.2 L 6 3.2 Q 6 7.4 1.8 7.4 L -1.6 7.4 Q -3.4 7.4 -3.4 5.6 L -3.4 -5.6 Q -3.4 -7.4 -1.6 -7.4 Z" tones={accent} top={-7.4} bottom={7.4} />
        </Group>
      ))}
    </>
  );
}

function Halo({ geo, lod, px }: TopperProps) {
  const y = Math.max(5, geo.top - 5);
  return (
    <Group transform={[{ translateX: geo.crown.x }, { translateY: y }]}>
      {lod > 0 && (
        <Oval x={-14} y={-4} width={28} height={8} style="stroke" strokeWidth={4.4} color="rgba(255,226,110,0.6)">
          <BlurMask blur={1.8} style="normal" />
        </Oval>
      )}
      <Oval x={-14} y={-4} width={28} height={8} style="stroke" strokeWidth={Math.max(2.8, 1.2 * px)}>
        <LinearGradient start={vec(-11, -3)} end={vec(11, 3)} colors={[gold.light, gold.fill, gold.deep]} />
      </Oval>
    </Group>
  );
}

function Sweatband({ geo, accent, lod }: TopperProps) {
  const y = forehead(geo, 0.52);
  const clip = useSwollen(geo, y, 1.05);
  const curve = (dy: number) => `M ${geo.left - 3} ${y + dy} Q ${geo.crown.x} ${y + dy + 5} ${geo.right + 3} ${y + dy}`;
  return (
    <>
      <Group clip={clip}>
        <Path path={curve(0)} style="stroke" strokeWidth={9}>
          <LinearGradient start={vec(0, y - 4)} end={vec(0, y + 8)} colors={[accent.light, accent.fill, accent.deep]} />
        </Path>
        {lod > 0 && <Path path={`${curve(-2.1)} ${curve(2.1)}`} style="stroke" strokeWidth={1.3} color="rgba(255,255,255,0.9)" />}
      </Group>
      {lod > 1 && (
        <Group transform={[{ translateX: geo.crown.x + geo.side.dx * 0.64 }, { translateY: y + 8.5 }]}>
          <Path path="M 0 -2.8 C 1.5 -0.7 2.1 0.6 2.1 1.4 A 2.1 2.1 0 0 1 -2.1 1.4 C -2.1 0.6 -1.5 -0.7 0 -2.8 Z" color="#9EE3FF" />
          <Circle cx={-0.6} cy={1} r={0.6} color="white" />
        </Group>
      )}
    </>
  );
}

function GradCap({ geo, accent, lod, px }: TopperProps) {
  const s = hatScale(geo, 12.4, 4.4);
  return (
    <Group transform={[{ translateX: geo.crown.x }, { translateY: geo.crown.y + 4.4 }, { rotate: -0.08 }, { scale: s }]}>
      <CandyPath path="M -9 -3.5 L -9 1.4 Q 0 4.4 9 1.4 L 9 -3.5 Z" tones={plum} top={-4} bottom={3} />
      {lod > 0 && <Path path="M -17 -6 L 0 0 L 17 -6 L 17 -4.6 L 0 1.5 L -17 -4.6 Z" color={plum.deep} />}
      <Path path="M -17 -6 L 0 -12 L 17 -6 L 0 0 Z">
        <LinearGradient start={vec(0, -12)} end={vec(0, 0)} colors={[plum.light, plum.fill]} />
      </Path>
      <Path path="M 0 -6 Q 8 -7 12.6 -5.2 L 12.6 3" style="stroke" strokeWidth={Math.max(1, 0.7 * px)} strokeCap="round" color={gold.fill} />
      <RoundedRect x={11.2} y={2} width={2.8} height={5.4} r={1.2} color={gold.fill} />
      <Circle cx={0} cy={-6} r={1.4} color={accent.fill} />
    </Group>
  );
}

function Beanie({ geo, accent, lod }: TopperProps) {
  const x = geo.crown.x;
  const cut = forehead(geo, 0.7);
  // As wide as the head at the rim, but a star's arms don't make it a sombrero.
  const hw = Math.min(widthOf(geo, cut) / 2 + 2.6, Math.max(22, geo.crown.w * 0.85));
  const top = Math.max(12, geo.top - 7);
  const dome = `M ${x - hw} ${cut} C ${x - hw} ${top + 7} ${x - hw * 0.6} ${top} ${x} ${top} C ${x + hw * 0.6} ${top} ${x + hw} ${top + 7} ${x + hw} ${cut} Z`;
  const rimTop = `M ${x - hw - 1.2} ${cut - 6} Q ${x} ${cut - 2.6} ${x + hw + 1.2} ${cut - 6}`;
  const rim = `${rimTop} L ${x + hw + 1.2} ${cut + 0.4} Q ${x} ${cut + 4} ${x - hw - 1.2} ${cut + 0.4} Z`;
  const rib = `M ${x - hw - 1.2} ${cut - 2.8} Q ${x} ${cut + 0.7} ${x + hw + 1.2} ${cut - 2.8}`;
  const knit: Tones = { light: mix(accent.light, '#FFFFFF', 0.25), fill: accent.light, deep: accent.fill };
  return (
    <>
      <CandyPath path={dome} tones={accent} top={top} bottom={cut} />
      {lod > 1 && (
        <Group clip={dome}>
          <Path path={`M ${x - hw} ${top + 1} L ${x + hw} ${top + 1}`} style="stroke" strokeWidth={(cut - top) * 2} color="rgba(0,0,0,0.07)">
            <DashPathEffect intervals={[1.2, 3.4]} />
          </Path>
        </Group>
      )}
      <CandyPath path={rim} tones={knit} top={cut - 6} bottom={cut + 3} />
      {lod > 0 && (
        <Group clip={rim}>
          <Path path={rib} style="stroke" strokeWidth={8} color={alpha(accent.deep, 0.22)}>
            <DashPathEffect intervals={[1.4, 1.9]} />
          </Path>
        </Group>
      )}
      <CandyPath path={`M ${x} ${top - 10.5} A 5.6 5.6 0 1 1 ${x} ${top + 0.7} A 5.6 5.6 0 1 1 ${x} ${top - 10.5} Z`} tones={knit} top={top - 10.5} bottom={top + 0.7} />
    </>
  );
}

function Propeller({ geo, accent, px }: TopperProps) {
  const s = hatScale(geo, 14.4, 4.2);
  const dome = 'M -9.5 1 C -9.5 -5.4 -5 -8.6 0 -8.6 C 5 -8.6 9.5 -5.4 9.5 1 Q 0 3 -9.5 1 Z';
  return (
    <Group transform={[{ translateX: geo.crown.x }, { translateY: geo.crown.y + 4.2 }, { rotate: 0.1 }, { scale: s }]}>
      <Group clip={dome}>
        <Rect x={-10} y={-10} width={6.8} height={14} color="#FF5C6C" />
        <Rect x={-3.2} y={-10} width={6.4} height={14} color={gold.fill} />
        <Rect x={3.2} y={-10} width={6.8} height={14} color="#4B8BFF" />
        <Path path={dome}>
          <LinearGradient start={vec(0, -9)} end={vec(0, 2)} colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)', 'rgba(0,0,0,0.15)']} />
        </Path>
      </Group>
      <Path path="M 0 -8.4 L 0 -11.8" style="stroke" strokeWidth={Math.max(1.4, 0.8 * px)} strokeCap="round" color={plum.fill} />
      <Oval x={-10.4} y={-14} width={9.6} height={3.8}>
        <LinearGradient start={vec(0, -14)} end={vec(0, -10)} colors={[accent.light, accent.deep]} />
      </Oval>
      <Oval x={0.8} y={-14} width={9.6} height={3.8}>
        <LinearGradient start={vec(0, -14)} end={vec(0, -10)} colors={[accent.light, accent.deep]} />
      </Oval>
      <Circle cx={0} cy={-12.1} r={1.6} color={plum.fill} />
    </Group>
  );
}

/** The topper parts drawn behind the body. */
export function TopperBack(props: TopperProps) {
  switch (props.topper) {
    case 'catEars':
      return <CatEars {...props} />;
    case 'bearEars':
      return <BearEars {...props} />;
    case 'bunnyEars':
      return <BunnyEars {...props} />;
    default:
      return null;
  }
}

/** The topper parts drawn in front of the body and face. */
export function TopperFront(props: TopperProps) {
  switch (props.topper) {
    case 'tuft':
      return <Tuft {...props} />;
    case 'sprout':
      return <Sprout {...props} />;
    case 'flower':
      return <Flower {...props} />;
    case 'antenna':
      return <Antenna {...props} />;
    case 'horns':
      return <Horns {...props} />;
    case 'dogEars':
      return <DogEars {...props} />;
    case 'bow':
      return <Bow {...props} />;
    case 'partyHat':
      return <PartyHat {...props} />;
    case 'chefHat':
      return <ChefHat {...props} />;
    case 'crown':
      return <Crown {...props} />;
    case 'headphones':
      return <Headphones {...props} />;
    case 'halo':
      return <Halo {...props} />;
    case 'sweatband':
      return <Sweatband {...props} />;
    case 'gradCap':
      return <GradCap {...props} />;
    case 'beanie':
      return <Beanie {...props} />;
    case 'propeller':
      return <Propeller {...props} />;
    default:
      return null;
  }
}
