import { View } from 'react-native';

/** A solid triangle drawn with borders, since the fonts have no geometric shapes. */
export function Triangle({ dir, size = 8, color }: { dir: 'left' | 'right' | 'up' | 'down'; size?: number; color: string }) {
  const half = size * 0.62;
  if (dir === 'left' || dir === 'right') {
    return (
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: half,
          borderBottomWidth: half,
          borderTopColor: 'transparent',
          borderBottomColor: 'transparent',
          ...(dir === 'left' ? { borderRightWidth: size, borderRightColor: color } : { borderLeftWidth: size, borderLeftColor: color }),
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: half,
        borderRightWidth: half,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        ...(dir === 'up' ? { borderBottomWidth: size, borderBottomColor: color } : { borderTopWidth: size, borderTopColor: color }),
      }}
    />
  );
}

/** A filled square, the stop symbol. */
export function Square({ size = 10, color }: { size?: number; color: string }) {
  return <View style={{ width: size, height: size, borderRadius: 1.5, backgroundColor: color }} />;
}
