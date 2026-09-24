import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, Text, type TextProps, View, type ViewStyle } from 'react-native';

import { font, lcd } from './theme';

// A fine pixel grid that shows through lit pixels, like a real matrix display.
const grid = Skia.RuntimeEffect.Make(`
half4 main(float2 p) {
  float2 g = fract(p / 2.6);
  float line = max(step(0.8, g.x), step(0.8, g.y));
  return half4(0.0, 0.0, 0.0, line * 0.5);
}`);

interface LcdProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Padding inside the glass. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Draw the pixel grid over the content. Off for scrolling lists. */
  pixels?: boolean;
}

/**
 * The display window: black glass set into the aluminium with a chamfered edge, an
 * inner shadow, a faint glare, and a pixel grid over whatever is shown.
 */
export function Lcd({ children, style, contentStyle, pixels = true }: LcdProps) {
  return (
    <View style={[styles.chamfer, style]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.08)', 'rgba(255,255,255,0.85)']}
        locations={[0, 0.5, 1]}
        style={[StyleSheet.absoluteFill, { borderRadius: 17 }]}
      />
      <View style={styles.bezel}>
        <View style={styles.glass}>
          <View style={[styles.content, contentStyle]}>{children}</View>
          {pixels && grid && (
            <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
              <Fill>
                <Shader source={grid} />
              </Fill>
            </Canvas>
          )}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0)']}
            style={styles.innerShadow}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>
    </View>
  );
}

interface LcdTextProps extends TextProps {
  size?: number;
  /** Dot-matrix face for headlines and numbers; the mono face for small print. */
  dot?: boolean;
  color?: string;
  glow?: boolean;
}

/** Amber display text with a soft glow. */
export function LcdText({ size = 12, dot = false, color = lcd.ink, glow = true, style, ...rest }: LcdTextProps) {
  return (
    <Text
      allowFontScaling={false}
      {...rest}
      style={[
        {
          fontFamily: dot ? font.dot : font.monoMedium,
          fontSize: size,
          color,
          letterSpacing: dot ? size * 0.02 : size * 0.06,
        },
        glow && { textShadowColor: lcd.glow, textShadowRadius: dot ? size * 0.22 : 6, textShadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  chamfer: { borderRadius: 17, padding: 2 },
  bezel: { flex: 1, borderRadius: 15, backgroundColor: lcd.bezel, padding: 5 },
  glass: { flex: 1, borderRadius: 10, backgroundColor: lcd.glass, overflow: 'hidden' },
  content: { flex: 1 },
  innerShadow: { position: 'absolute', left: 0, right: 0, top: 0, height: 12 },
});
