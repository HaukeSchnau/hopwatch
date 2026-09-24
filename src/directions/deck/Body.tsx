import { Canvas, ColorMatrix, FractalNoise, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, Text, type TextProps, type TextStyle, useWindowDimensions, View, type ViewStyle } from 'react-native';

import { body, font } from './theme';

const grayscale = [0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 0, 1];

/** Brushed warm aluminium behind a whole screen. Static, drawn once. */
export function Aluminium() {
  const { width, height } = useWindowDimensions();
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={[body.top, body.base, body.bottom]} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height} opacity={0.035} blendMode="multiply">
        <FractalNoise freqX={0.004} freqY={1.6} octaves={2} seed={7} />
        <ColorMatrix matrix={grayscale} />
      </Rect>
      <Rect x={0} y={0} width={width} height={height} opacity={0.03} blendMode="screen">
        <FractalNoise freqX={0.01} freqY={2.2} octaves={1} seed={3} />
        <ColorMatrix matrix={grayscale} />
      </Rect>
    </Canvas>
  );
}

/** The screen-sized device body: aluminium with content on top. */
export function Body({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.body, style]}>
      <Aluminium />
      {children}
    </View>
  );
}

interface PrintProps extends TextProps {
  size?: number;
  weight?: 'regular' | 'medium' | 'bold';
  color?: string;
  spacing?: number;
}

/** Small caps mono printed on the aluminium, like the legends on a synth. */
export function Print({ size = 9, weight = 'medium', color = body.ink2, spacing, style, ...rest }: PrintProps) {
  const family = weight === 'bold' ? font.monoBold : weight === 'medium' ? font.monoMedium : font.mono;
  const printStyle: TextStyle = {
    fontFamily: family,
    fontSize: size,
    color,
    letterSpacing: spacing ?? size * 0.12,
    textTransform: 'uppercase',
  };
  return <Text allowFontScaling={false} {...rest} style={[printStyle, style]} />;
}

/** An engraved line across the body. */
export function Groove({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={style}>
      <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: body.groove }} />
      <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: body.grooveLight }} />
    </View>
  );
}

/** A countersunk screw head, slot at an angle. */
export function Screw({ size = 11, angle = 32 }: { size?: number; angle?: number }) {
  return (
    <View style={[styles.screwHole, { width: size + 3, height: size + 3, borderRadius: size }]}>
      <View style={[styles.screw, { width: size, height: size, borderRadius: size }]}>
        <View style={[styles.slot, { width: size * 0.72, transform: [{ rotate: `${angle}deg` }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, backgroundColor: body.base },
  screwHole: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.14)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.8)',
  },
  screw: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9C4BA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.9)',
  },
  slot: { height: 1.5, borderRadius: 1, backgroundColor: 'rgba(40,36,30,0.55)' },
});
