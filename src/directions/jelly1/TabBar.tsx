// The floating bubbly tab bar. A pink gummy bubble slides under the active tab and
// stretches like jelly while it travels.

import { usePathname } from 'expo-router';
import { TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buzz } from './feedback';
import { candy, colors, fonts, TAB_BAR_HEIGHT } from './theme';

export const tabs = [
  { name: 'now', href: '/jelly1', label: 'Now', icon: 'face.smiling.inverse' },
  { name: 'day', href: '/jelly1/day', label: 'Day', icon: 'calendar.day.timeline.left' },
  { name: 'week', href: '/jelly1/week', label: 'Week', icon: 'circle.hexagongrid.fill' },
  { name: 'stuff', href: '/jelly1/stuff', label: 'Stuff', icon: 'square.stack.3d.up.fill' },
  { name: 'settings', href: '/jelly1/settings', label: 'Settings', icon: 'gearshape.fill' },
] as const satisfies readonly { name: string; href: string; label: string; icon: SymbolViewProps['name'] }[];

const INSET = 6;

/** Distance from the screen bottom to the bar, shared with the toast. */
export function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 8, 14);
}

export function TabBar() {
  const pathname = usePathname();
  const bottom = useTabBarBottom();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - 28, 400);
  const item = (width - INSET * 2) / tabs.length;
  const active = Math.max(
    0,
    tabs.findIndex((t) => t.href === pathname),
  );

  const x = useSharedValue(active * item);
  const target = useSharedValue(active * item);
  useEffect(() => {
    target.set(active * item);
    x.set(withSpring(active * item, { damping: 13, stiffness: 190, mass: 0.8 }));
  }, [active, item, target, x]);

  const bubble = useAnimatedStyle(() => {
    const travel = Math.min(1, Math.abs(target.get() - x.get()) / item);
    return {
      transform: [{ translateX: x.get() }, { scaleX: 1 + travel * 0.55 }, { scaleY: 1 - travel * 0.18 }],
    };
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <View style={[styles.bar, { width }]}>
        <Animated.View style={[styles.bubble, { width: item }, bubble]}>
          <View style={styles.bubbleInner}>
            <View style={styles.gloss} />
          </View>
        </Animated.View>
        {tabs.map((t, i) => (
          <TabTrigger key={t.name} name={t.name} asChild>
            <TabButton label={t.label} icon={t.icon} width={item} focused={i === active} />
          </TabTrigger>
        ))}
      </View>
    </View>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  label: string;
  icon: SymbolViewProps['name'];
  width: number;
  focused: boolean;
};

function TabButton({ label, icon, width, focused, onPress, isFocused: _isFocused, href: _href, ...rest }: TabButtonProps) {
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (!focused) buzz.tick();
        onPress?.(e);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={[styles.item, { width }]}>
      <SymbolView name={icon} size={22} tintColor={focused ? colors.white : colors.muted} weight="semibold" />
      <Text style={[styles.label, { color: focused ? colors.white : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const pink = candy.pink;

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: INSET,
    shadowColor: '#5A3A55',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  bubble: { position: 'absolute', left: INSET, top: INSET, bottom: INSET, paddingHorizontal: 3 },
  bubbleInner: {
    flex: 1,
    borderRadius: 99,
    backgroundColor: pink.fill,
    borderBottomWidth: 3,
    borderBottomColor: pink.deep,
    shadowColor: pink.deep,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  gloss: { position: 'absolute', top: 4, left: 12, right: 22, height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.4)' },
  item: { height: TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fonts.display, fontSize: 11.5, letterSpacing: 0.2 },
});
