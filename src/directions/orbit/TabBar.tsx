import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, sky } from './theme';

export const TAB_BAR_HEIGHT = 60;

/** Space the floating bar covers at the bottom of a screen, for content padding. */
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_HEIGHT + 20;
}

export const tabs = [
  { name: 'now', href: '/orbit', icon: 'smallcircle.filled.circle', label: 'Now' },
  { name: 'day', href: '/orbit/day', icon: 'calendar.day.timeline.left', label: 'Day' },
  { name: 'report', href: '/orbit/report', icon: 'chart.bar.xaxis', label: 'Report' },
  { name: 'contexts', href: '/orbit/contexts', icon: 'point.3.filled.connected.trianglepath.dotted', label: 'Contexts' },
  { name: 'settings', href: '/orbit/settings', icon: 'gearshape', label: 'Settings' },
] as const satisfies readonly { name: string; href: string; icon: SymbolViewProps['name']; label: string }[];

/** The floating capsule of icons; the active one glows. */
export function TabBar() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 4 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
        {tabs.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} asChild>
            <TabButton icon={tab.icon} label={tab.label} />
          </TabTrigger>
        ))}
      </View>
    </View>
  );
}

function TabButton({ icon, label, isFocused, onPress, href: _href, ...props }: TabTriggerSlotProps & { icon: SymbolViewProps['name']; label: string }) {
  const glow = useAnimatedStyle(() => ({
    opacity: withSpring(isFocused ? 1 : 0),
    transform: [{ scale: withSpring(isFocused ? 1 : 0.4, { damping: 14 }) }],
  }));
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        if (!isFocused) Haptics.selectionAsync();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={styles.button}>
      <Animated.View style={[styles.halo, glow]} />
      <SymbolView name={icon} size={21} tintColor={isFocused ? sky.accent : sky.faint} weight={isFocused ? 'semibold' : 'regular'} />
      <Animated.View style={[styles.dot, glow]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: sky.hairlineHi,
  },
  tint: { backgroundColor: 'rgba(10,12,19,0.72)' },
  button: { width: 60, height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: alpha(sky.accent, 0.1),
  },
  dot: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: sky.accent,
    shadowColor: sky.accent,
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
});
