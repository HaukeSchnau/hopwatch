// The empty dimple a jelly leaves behind: a dashed outline in its body's exact shape.
// Shown in a tile's slot while its jelly is up on the stage, and on an empty stage.

import { Canvas, DashPathEffect, Group, Path } from '@shopify/react-native-skia';

import { useHopwatch } from '@/core';

import { bodyGeo, UNIT } from './character/bodies';
import type { LookSource } from './character/derive';
import { useLook } from './character/look';
import { alpha } from './theme';

interface MouldProps {
  /** The context id, or any seed for a shape that belongs to nobody. */
  seed: string;
  size: number;
  color: string;
  fill?: string;
  /** The context, when at hand; otherwise it's looked up by `seed`. */
  context?: LookSource;
}

export function Mould({ seed, size, color, fill, context }: MouldProps) {
  const known = useHopwatch((s) => (context ? null : (s.tree.ordered.find((c) => c.id === seed) ?? null)));
  const look = useLook(context ?? known ?? { id: seed, glyph: null });
  const geo = bodyGeo(look.body, seed);
  const unit = size / UNIT;
  const stroke = Math.max(2, size * 0.028) / unit;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: unit }]}>
        <Path path={geo.path} color={fill ?? alpha(color, 0.08)} />
        <Path path={geo.path} style="stroke" strokeWidth={stroke} strokeCap="round" color={alpha(color, 0.55)}>
          <DashPathEffect intervals={[stroke * 2.4, stroke * 2.2]} />
        </Path>
      </Group>
    </Canvas>
  );
}
