// A two-line rounded title for native headers: "Today" over "Tue 29 Sep". Tappable when
// it can jump back to the present.

import { Pressable, StyleSheet, Text } from 'react-native';

import { shellText } from '@/i18n/shell';

import { text, useTheme } from './theme';

export function HeaderTitle({ title, subtitle, onPress }: { title: string; subtitle: string; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'header'}
      accessibilityHint={onPress ? shellText.header.jumpHint : undefined}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.5 }]}>
      <Text style={[text.headline, { color: t.c.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[text.caption, { color: onPress ? t.c.pinkDeep : t.c.muted }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', minWidth: 140 },
});
