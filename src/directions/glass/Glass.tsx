import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import { type ColorValue, Pressable, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from './theme';

const liquid = isLiquidGlassAvailable();

interface GlassProps {
  style?: StyleProp<ViewStyle>;
  tint?: ColorValue;
  /** Lets the glass react to touches with the system's press shimmer. */
  interactive?: boolean;
  /** The clearer glass variant, for small controls on busy backgrounds. */
  clear?: boolean;
  children?: ReactNode;
  pointerEvents?: ComponentProps<typeof GlassView>['pointerEvents'];
}

/**
 * A Liquid Glass surface. Falls back to a frosted blur where Liquid Glass isn't
 * available. Never fade it with opacity: glass stops rendering at opacity 0.
 */
export function Glass({ style, tint, interactive, clear, children, pointerEvents }: GlassProps) {
  const theme = useTheme();
  if (!liquid) {
    return (
      <BlurView
        intensity={60}
        tint={theme.dark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'}
        style={[style, { overflow: 'hidden' }, tint ? { backgroundColor: tint } : null]}
        pointerEvents={pointerEvents}>
        {children}
      </BlurView>
    );
  }
  return (
    <GlassView
      style={style}
      glassEffectStyle={clear ? 'clear' : 'regular'}
      tintColor={tint}
      isInteractive={interactive}
      pointerEvents={pointerEvents}>
      {children}
    </GlassView>
  );
}

interface GlassButtonProps {
  symbol: SFSymbol;
  onPress: () => void;
  label: string;
  size?: number;
  tint?: ColorValue;
  symbolColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

/** A round glass toolbar button with an SF Symbol, 44 pt by default. */
export function GlassButton({ symbol, onPress, label, size = 44, tint, symbolColor, style }: GlassButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [style, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
      <Glass interactive tint={tint} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }]}>
        <SymbolView name={symbol} size={size * 0.42} weight="semibold" tintColor={symbolColor ?? theme.label} />
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center' },
});
