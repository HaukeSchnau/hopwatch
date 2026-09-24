import { BlurMask, Canvas, Circle, Group, Path } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';

import { arcPath, dialFrame } from '../geometry';
import { font, sky } from '../theme';

/**
 * A ring that fills toward a target. Past 100 % a brighter second lap starts, so
 * overtime stays visible instead of clipping.
 */
export function Gauge({ ratio, color, size = 60 }: { ratio: number; color: string; size?: number }) {
  const frame = dialFrame(size, 6, 6);
  const first = Math.min(ratio, 1) * 360;
  const over = Math.min(Math.max(ratio - 1, 0), 1) * 360;
  // Arcs start at 12 o'clock; arcPath's angles are clockwise from there.
  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={frame.cx} cy={frame.cy} r={frame.r} style="stroke" strokeWidth={frame.stroke} color={sky.track} />
        <Group>
          <BlurMask blur={5} style="solid" respectCTM />
          {first > 0 && <Path path={arcPath(frame, 0, first)} style="stroke" strokeWidth={frame.stroke} color={color} strokeCap="round" />}
        </Group>
        {over > 0 && (
          <Path path={arcPath(frame, 0, over)} style="stroke" strokeWidth={frame.stroke - 2} color="#FFFFFF" strokeCap="round" opacity={0.85} />
        )}
      </Canvas>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.pct}>{Math.round(ratio * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  pct: { fontFamily: font.mono, fontSize: 11, color: sky.text },
});
