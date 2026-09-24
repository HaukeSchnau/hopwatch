import { Canvas, Fill, FractalNoise } from '@shopify/react-native-skia';
import { StyleSheet } from 'react-native';

import { paper } from './theme';

/**
 * The page stock: flat warm paper with a faint grain of fibres and a broad, uneven
 * mottle. Drawn once by Skia behind a screen; it never re-renders on its own.
 */
export function Paper({ color = paper.sheet }: { color?: string }) {
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill color={color} />
      <Fill opacity={0.03}>
        <FractalNoise freqX={0.01} freqY={0.016} octaves={2} seed={7} />
      </Fill>
      <Fill opacity={0.045}>
        <FractalNoise freqX={0.85} freqY={0.85} octaves={1} seed={3} />
      </Fill>
    </Canvas>
  );
}
