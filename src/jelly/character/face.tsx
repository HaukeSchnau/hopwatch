// Eyes and mouths, drawn in face space: the face centre is (0, 0) and a standard face is
// about 50 units wide. Every eye style has an awake and an asleep drawing that cross-fade
// with `awake`, and reacts to `blink`, `lookX`/`lookY`; every mouth gives way to the same
// yawn. `px` is one screen point in face units, for strokes that must stay visible.

import { BlurMask, Circle, Group, LinearGradient, Oval, Path, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';

import type { Face } from '../Gummy';
import { alpha } from '../theme';
import { INK, TONGUE, type Tones } from './paint';
import type { Eyes, Mouth } from './traits';

/** Level of detail: 0 for list rows and toasts, 1 for thumbnails, 2 for tiles and up. */
export type Lod = 0 | 1 | 2;

export interface FacePartProps {
  face: Face;
  lod: Lod;
  px: number;
  tones: Tones;
}

const EX = 12.5;
const EY = -1;

const line = (px: number) => Math.max(1.9, 1.2 * px);

/** Closed eyes, one arc per side, curving down like a sleeping smile. */
function closedArcs(dx: number, y: number, w: number, depth: number) {
  return `M ${-dx - w} ${y} Q ${-dx} ${y + depth} ${-dx + w} ${y} M ${dx - w} ${y} Q ${dx} ${y + depth} ${dx + w} ${y}`;
}

function useOpen(face: Face) {
  return useDerivedValue(() => face.awake.get());
}

function useShut(face: Face) {
  return useDerivedValue(() => 1 - face.awake.get());
}

/** Position, glance and blink for one eye. */
function useEye(face: Face, x: number, y: number, range: number) {
  return useDerivedValue(() => [
    { translateX: x + face.lookX.get() * range },
    { translateY: y + face.lookY.get() * range * 0.8 },
    { scaleY: Math.max(0.06, face.blink.get()) },
  ]);
}

function DotEyes({ face, lod, px, r = 3.8, dx = EX }: FacePartProps & { r?: number; dx?: number }) {
  const left = useEye(face, -dx, EY, r * 0.5);
  const right = useEye(face, dx, EY, r * 0.5);
  const open = useOpen(face);
  const shut = useShut(face);
  return (
    <>
      <Path path={closedArcs(dx, EY, r * 1.08, r * 1.35)} style="stroke" strokeWidth={line(px)} strokeCap="round" color={INK} opacity={shut} />
      <Group opacity={open}>
        {[left, right].map((transform, i) => (
          <Group key={i} transform={transform}>
            <Circle cx={0} cy={0} r={r} color={INK} />
            {lod > 0 && <Circle cx={-r * 0.34} cy={-r * 0.36} r={r * 0.36} color="white" />}
          </Group>
        ))}
      </Group>
    </>
  );
}

function ShinyEyes({ face, lod, px }: FacePartProps) {
  const dx = 13;
  const left = useEye(face, -dx, EY - 0.6, 2);
  const right = useEye(face, dx, EY - 0.6, 2);
  const open = useOpen(face);
  const shut = useShut(face);
  const w = line(px);
  // Lashes flick out from the outer corners of the closed eyes.
  const lashes = `M ${dx + 4.8} ${EY} l 2 -1.6 M ${-dx - 4.8} ${EY} l -2 -1.6`;
  return (
    <>
      <Group opacity={shut}>
        <Path path={closedArcs(dx, EY, 4.8, 5.4)} style="stroke" strokeWidth={w} strokeCap="round" color={INK} />
        {lod > 0 && <Path path={lashes} style="stroke" strokeWidth={w * 0.8} strokeCap="round" color={INK} />}
      </Group>
      <Group opacity={open}>
        {[left, right].map((transform, i) => (
          <Group key={i} transform={transform}>
            <Oval x={-4.6} y={-5.6} width={9.2} height={11.2}>
              <LinearGradient start={vec(0, -5.6)} end={vec(0, 5.6)} colors={[INK, '#4B3470']} />
            </Oval>
            <Circle cx={-1.5} cy={-2.3} r={lod > 0 ? 1.9 : 1.6} color="white" />
            {lod > 0 && <Circle cx={1.7} cy={2.3} r={0.95} color="rgba(255,255,255,0.9)" />}
          </Group>
        ))}
      </Group>
    </>
  );
}

function GooglyEyes({ face, lod, px, tones }: FacePartProps) {
  const r = 6.8;
  const ring = Math.max(0.9, 0.75 * px);
  const dx = 13;
  const blinkL = useDerivedValue(() => [{ translateX: -dx }, { translateY: EY - 1 }, { scaleY: Math.max(0.06, face.blink.get()) }]);
  const blinkR = useDerivedValue(() => [{ translateX: dx }, { translateY: EY - 1 }, { scaleY: Math.max(0.06, face.blink.get()) }]);
  // Pupils sag a little, like real googly eyes, and roll with the glance.
  const pupil = useDerivedValue(() => [{ translateX: face.lookX.get() * 3 }, { translateY: 1.1 + face.lookY.get() * 2.4 }]);
  const open = useOpen(face);
  const shut = useShut(face);
  return (
    <>
      {/* Asleep: the lids close over the bulging eyes. */}
      <Group opacity={shut}>
        {[-dx, dx].map((x) => (
          <Group key={x} transform={[{ translateX: x }, { translateY: EY - 1 }]}>
            <Circle cx={0} cy={0} r={r}>
              <LinearGradient start={vec(0, -r)} end={vec(0, r)} colors={[tones.light, tones.fill]} />
            </Circle>
            <Circle cx={0} cy={0} r={r} style="stroke" strokeWidth={ring} color={INK} />
            <Path path={`M ${-r} 0.4 Q 0 ${r * 0.62} ${r} 0.4`} style="stroke" strokeWidth={line(px) * 0.85} strokeCap="round" color={INK} />
          </Group>
        ))}
      </Group>
      <Group opacity={open}>
        {[blinkL, blinkR].map((transform, i) => (
          <Group key={i} transform={transform}>
            <Circle cx={0} cy={0} r={r} color="white" />
            <Circle cx={0} cy={0} r={r} style="stroke" strokeWidth={ring} color={INK} />
            <Group transform={pupil}>
              <Circle cx={0} cy={0} r={3.4} color={INK} />
              {lod > 0 && <Circle cx={-1.1} cy={-1.2} r={0.95} color="white" />}
            </Group>
          </Group>
        ))}
      </Group>
    </>
  );
}

function SleepyEyes({ face, lod, px }: FacePartProps) {
  const r = 4.2;
  const left = useEye(face, -EX, EY + 0.6, 1.6);
  const right = useEye(face, EX, EY + 0.6, 1.6);
  const open = useOpen(face);
  const shut = useShut(face);
  const w = line(px);
  // A heavy, domed lid covers the top half of each eye.
  const lid = `M ${-r - 1.2} 0.9 Q 0 ${-r * 0.55} ${r + 1.2} 0.9`;
  const below = `${lid} L ${r + 2} ${r + 2} L ${-r - 2} ${r + 2} Z`;
  return (
    <>
      <Path
        path={`M ${-EX - 4.4} ${EY + 0.8} Q ${-EX} ${EY + 2.8} ${-EX + 4.4} ${EY + 0.8} M ${EX - 4.4} ${EY + 0.8} Q ${EX} ${EY + 2.8} ${EX + 4.4} ${EY + 0.8}`}
        style="stroke"
        strokeWidth={w}
        strokeCap="round"
        color={INK}
        opacity={shut}
      />
      <Group opacity={open}>
        {[left, right].map((transform, i) => (
          <Group key={i} transform={transform}>
            <Group clip={below}>
              <Circle cx={0} cy={0.6} r={r} color={INK} />
              {lod > 0 && <Circle cx={-1.3} cy={1.9} r={0.95} color="white" />}
            </Group>
            <Path path={lid} style="stroke" strokeWidth={w} strokeCap="round" color={INK} />
          </Group>
        ))}
      </Group>
    </>
  );
}

function HappyEyes({ face, px }: FacePartProps) {
  const left = useEye(face, -EX, EY, 1.6);
  const right = useEye(face, EX, EY, 1.6);
  const open = useOpen(face);
  const shut = useShut(face);
  const w = line(px) * 1.05;
  return (
    <>
      <Path path={closedArcs(EX, EY, 4, 4.8)} style="stroke" strokeWidth={w} strokeCap="round" color={INK} opacity={shut} />
      <Group opacity={open}>
        {[left, right].map((transform, i) => (
          <Group key={i} transform={transform}>
            <Path path="M -4.2 1.8 Q 0 -4.2 4.2 1.8" style="stroke" strokeWidth={w} strokeCap="round" strokeJoin="round" color={INK} />
          </Group>
        ))}
      </Group>
    </>
  );
}

function CyclopsEye({ face, lod, px, tones }: FacePartProps) {
  const r = 8.4;
  const y = -3.6;
  const ring = Math.max(0.9, 0.75 * px);
  const w = line(px);
  const blink = useDerivedValue(() => [{ translateY: y }, { scaleY: Math.max(0.06, face.blink.get()) }]);
  const iris = useDerivedValue(() => [{ translateX: face.lookX.get() * 3.3 }, { translateY: face.lookY.get() * 2.6 }]);
  const open = useOpen(face);
  const shut = useShut(face);
  // Lashes hang from the closed lid.
  const lashes = 'M -4.6 1.9 l -1.3 2 M 0 2.7 l 0 2.2 M 4.6 1.9 l 1.3 2';
  return (
    <>
      <Group opacity={shut} transform={[{ translateY: y + 1 }]}>
        <Path path={`M ${-r} -1 Q 0 ${r * 0.72} ${r} -1`} style="stroke" strokeWidth={w * 1.05} strokeCap="round" color={INK} />
        {lod > 0 && <Path path={lashes} style="stroke" strokeWidth={w * 0.75} strokeCap="round" color={INK} />}
      </Group>
      <Group opacity={open} transform={blink}>
        <Circle cx={0} cy={0} r={r} color="white" />
        <Circle cx={0} cy={0} r={r} style="stroke" strokeWidth={ring} color={INK} />
        <Group transform={iris}>
          <Circle cx={0} cy={0} r={4.6}>
            <LinearGradient start={vec(0, -4.6)} end={vec(0, 4.6)} colors={[tones.deep, tones.fill]} />
          </Circle>
          <Circle cx={0} cy={0} r={2.5} color={INK} />
          {lod > 0 && <Circle cx={-1.5} cy={-1.6} r={1.25} color="white" />}
        </Group>
      </Group>
    </>
  );
}

function GlassesEyes(props: FacePartProps) {
  const { lod, px } = props;
  const dx = 13.2;
  const r = 7.6;
  const frame = Math.max(1.4, 0.95 * px);
  return (
    <>
      <DotEyes {...props} r={3.1} dx={dx} />
      {lod > 0 && (
        <>
          <Circle cx={-dx} cy={EY} r={r} color="rgba(255,255,255,0.2)" />
          <Circle cx={dx} cy={EY} r={r} color="rgba(255,255,255,0.2)" />
        </>
      )}
      <Circle cx={-dx} cy={EY} r={r} style="stroke" strokeWidth={frame} color={INK} />
      <Circle cx={dx} cy={EY} r={r} style="stroke" strokeWidth={frame} color={INK} />
      <Path path={`M ${-dx + r} ${EY - 1.2} Q 0 ${EY - 3.8} ${dx - r} ${EY - 1.2}`} style="stroke" strokeWidth={frame} strokeCap="round" color={INK} />
      {lod > 1 && (
        <Path
          path={`M ${-dx + 2} ${EY - 4.6} l 2.4 1.6 M ${dx + 2} ${EY - 4.6} l 2.4 1.6`}
          style="stroke"
          strokeWidth={1}
          strokeCap="round"
          color="rgba(255,255,255,0.85)"
        />
      )}
    </>
  );
}

const LENS = 'M -6.8 -4.4 L 6.8 -4.4 Q 7.7 -4.4 7.5 -3.2 L 6.5 2.3 Q 5.7 5.5 2 5.5 L -2 5.5 Q -5.7 5.5 -6.5 2.3 L -7.5 -3.2 Q -7.7 -4.4 -6.8 -4.4 Z';

function ShadesEyes(props: FacePartProps) {
  const { face, lod, px } = props;
  const dx = 11.8;
  const shut = useShut(face);
  // Awake they sit on the eyes; asleep they're pushed up onto the forehead.
  const wear = useDerivedValue(() => {
    const up = 1 - face.awake.get();
    return [{ translateX: face.lookX.get() * 1.2 }, { translateY: EY - up * 13 }, { scale: 1 - up * 0.12 }];
  });
  return (
    <>
      <Path path={closedArcs(EX, EY + 0.5, 4, 4.8)} style="stroke" strokeWidth={line(px)} strokeCap="round" color={INK} opacity={shut} />
      <Group transform={wear}>
        <RoundedRect x={-dx + 5} y={-4.5} width={2 * dx - 10} height={2.2} r={1.1} color={INK} />
        {[-dx, dx].map((x) => (
          <Group key={x} transform={[{ translateX: x }]}>
            <Path path={LENS}>
              <LinearGradient start={vec(0, -4.4)} end={vec(0, 5.5)} colors={['#4A3566', INK]} />
            </Path>
            {lod > 0 && <Path path="M -4.8 1.8 L -1.4 -2.6" style="stroke" strokeWidth={1.3} strokeCap="round" color="rgba(255,255,255,0.55)" />}
          </Group>
        ))}
      </Group>
    </>
  );
}

/** The eyes of `style`, in face space. */
export function EyesPart({ style, ...props }: FacePartProps & { style: Eyes }) {
  switch (style) {
    case 'dot':
      return <DotEyes {...props} />;
    case 'shiny':
      return <ShinyEyes {...props} />;
    case 'googly':
      return <GooglyEyes {...props} />;
    case 'sleepy':
      return <SleepyEyes {...props} />;
    case 'happy':
      return <HappyEyes {...props} />;
    case 'cyclops':
      return <CyclopsEye {...props} />;
    case 'glasses':
      return <GlassesEyes {...props} />;
    case 'shades':
      return <ShadesEyes {...props} />;
  }
}

/** How far the mouth moves down for an eye style that takes more room. */
export const mouthDrop: Record<Eyes, number> = {
  dot: 0,
  shiny: 0.5,
  googly: 0.8,
  sleepy: 0,
  happy: 0,
  cyclops: 2.6,
  glasses: 1,
  shades: 0.6,
};

const GRIN = 'M -7 7.2 Q 0 8.8 7 7.2 Q 6.4 15.8 0 15.8 Q -6.4 15.8 -7 7.2 Z';
const SMILE = 'M -5.5 7.5 Q 0 13 5.5 7.5';

function MouthShape({ style, lod, px }: { style: Mouth; lod: Lod; px: number }) {
  const w = line(px);
  const stroke = { style: 'stroke', strokeWidth: w, strokeCap: 'round', strokeJoin: 'round', color: INK } as const;
  switch (style) {
    case 'smile':
      return <Path path={SMILE} {...stroke} />;
    case 'grin':
      return (
        <Group clip={GRIN}>
          <Path path={GRIN} color={INK} />
          {lod > 0 && <Rect x={-8} y={6} width={16} height={3.8} color="white" />}
          <Oval x={-4} y={12} width={8} height={5.6} color={TONGUE} />
        </Group>
      );
    case 'cat':
      return <Path path="M -6 7.8 Q -3 11.8 0 8.6 Q 3 11.8 6 7.8" {...stroke} />;
    case 'o':
      return (
        <>
          <Oval x={-3.2} y={7} width={6.4} height={7.4} color={INK} />
          {lod > 0 && <Oval x={-2} y={10.8} width={4} height={2.8} color={TONGUE} />}
        </>
      );
    case 'blep':
      return (
        <>
          <Path path="M -0.4 9.4 L 4.4 9.4 L 4.4 12.6 Q 4.4 15.4 2 15.4 Q -0.4 15.4 -0.4 12.6 Z" color={TONGUE} />
          {lod > 0 && <Path path="M 2 10.4 L 2 13" style="stroke" strokeWidth={0.8} strokeCap="round" color="#E0507A" />}
          <Path path="M -5 7.6 Q 0 12.2 5 7.6" {...stroke} />
        </>
      );
    case 'fang':
      return (
        <>
          {lod > 0 && <Path path="M 1.4 9.3 L 4.8 8.5 L 3.5 13 Z" color="white" />}
          <Path path={SMILE} {...stroke} />
        </>
      );
    case 'buck':
      return (
        <>
          {lod > 0 && (
            <>
              <RoundedRect x={-2.9} y={9} width={2.8} height={4.2} r={0.8} color="white" />
              <RoundedRect x={0.1} y={9} width={2.8} height={4.2} r={0.8} color="white" />
            </>
          )}
          <Path path="M -5.5 7.6 Q 0 12 5.5 7.6" {...stroke} />
        </>
      );
    case 'flat':
      return <Path path="M -4.6 10.2 Q 0 11 4.8 8.8" {...stroke} />;
    case 'wobbly':
      return <Path path="M -6 9.4 Q -4.5 7.4 -3 9.4 Q -1.5 11.4 0 9.4 Q 1.5 7.4 3 9.4 Q 4.5 11.4 6 9.4" {...stroke} strokeWidth={w * 0.85} />;
  }
}

/** The mouth of `style`, giving way to an open yawn as `face.yawn` rises. */
export function MouthPart({ style, face, lod, px, drop }: FacePartProps & { style: Mouth; drop: number }) {
  const shown = useDerivedValue(() => 1 - face.yawn.get());
  const yawn = useDerivedValue(() => [{ translateY: 11.2 + drop }, { scaleY: Math.max(0.001, face.yawn.get()) }]);
  return (
    <>
      <Group opacity={shown} transform={[{ translateY: drop + 9 }, { scale: 1.2 }, { translateY: -9 }]}>
        <MouthShape style={style} lod={lod} px={px / 1.2} />
      </Group>
      <Group transform={yawn}>
        <Oval x={-3.5} y={-4.6} width={7} height={9.2} color={INK} />
        <Oval x={-2.1} y={0.6} width={4.2} height={3.2} color={TONGUE} />
      </Group>
    </>
  );
}

/** Blushing cheeks, and freckles when the coat has them. */
export function Cheeks({ blush, freckles, tones, lod, spread }: { blush: string; freckles: boolean; tones: Tones; lod: Lod; spread: number }) {
  if (lod === 0) return null;
  const dots = [
    [15.8, 6.6],
    [18.2, 4.6],
    [20.6, 6.8],
    [18.6, 8.6],
  ];
  return (
    <>
      {[-1, 1].map((side) => (
        <Oval key={side} x={side * spread - 4.6} y={2.2} width={9.2} height={5.2} color={blush}>
          <BlurMask blur={1.4} style="normal" />
        </Oval>
      ))}
      {freckles &&
        dots.flatMap(([x, y]) => [-1, 1].map((side) => <Circle key={`${x}${side}`} cx={side * (x + spread - 19.5)} cy={y} r={0.8} color={alpha(tones.deep, 0.75)} />))}
    </>
  );
}
