import { StyleSheet, View } from 'react-native';

import { lcd } from '../theme';

interface MeterProps {
  /** 0…1 of the meter lit; above 1 lights overflow segments. */
  value: number;
  segments?: number;
  color?: string;
  /** Color for segments past 100%, e.g. over a weekly target. */
  overColor?: string;
  height?: number;
}

/** A segmented LED bar, the display's way of drawing a proportion. */
export function Meter({ value, segments = 10, color = lcd.ink, overColor, height = 9 }: MeterProps) {
  const lit = Math.round(Math.max(0, Math.min(1, value)) * segments);
  const over = overColor ? Math.min(segments, Math.round(Math.max(0, value - 1) * segments)) : 0;
  return (
    <View style={styles.meter}>
      {Array.from({ length: segments }, (_, i) => {
        const on = i < lit;
        const isOver = i >= segments - over;
        const fill = isOver && overColor ? overColor : color;
        return (
          <View
            key={i}
            style={[
              styles.segment,
              { height, backgroundColor: on ? fill : lcd.ghost },
              on && { shadowColor: fill, shadowOpacity: 0.8, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', gap: 2 },
  segment: { width: 5, borderRadius: 1 },
});
