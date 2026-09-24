// The empty dimple a blob leaves behind: a dashed outline in the blob's exact shape.
// Shown in a tile's slot while its blob is up on the stage, and on an empty stage.

import { Canvas, DashPathEffect, Path } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { blobBox, gummyPath } from './geometry';
import { alpha } from './theme';

export function Mould({ seed, size, color, fill }: { seed: string; size: number; color: string; fill?: string }) {
  const path = useMemo(() => gummyPath(seed, blobBox(size)), [seed, size]);
  const stroke = Math.max(2, size * 0.028);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={path} color={fill ?? alpha(color, 0.08)} />
      <Path path={path} style="stroke" strokeWidth={stroke} strokeCap="round" color={alpha(color, 0.55)}>
        <DashPathEffect intervals={[stroke * 2.4, stroke * 2.2]} />
      </Path>
    </Canvas>
  );
}
