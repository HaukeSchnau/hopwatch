import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { actions, useSwitchTarget } from '@/core';

import { Glass } from '../Glass';
import { Glyph } from '../Glyph';
import { useTheme } from '../theme';

/**
 * The most prominent control: "Back to Job" while something runs, "Resume Job" when
 * nothing does. Tinted glass in the target's color, so the thumb finds it by hue.
 */
export function SwitchButton() {
  const target = useSwitchTarget();
  const theme = useTheme();
  if (!target) return null;
  const hue = theme.hue(target.context.hue);
  const back = target.kind === 'back';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        actions.back();
      }}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <Glass interactive tint={hue.solid} style={styles.button}>
        <SymbolView
          name={back ? 'arrow.uturn.backward' : 'play.fill'}
          size={19}
          weight="bold"
          tintColor={hue.onSolid}
        />
        <Text style={[styles.label, { color: hue.onSolid }]} numberOfLines={1}>
          {back ? 'Back to ' : 'Resume '}
          <Text style={styles.name}>{target.context.name}</Text>
        </Text>
        <View style={styles.glyph}>
          <Glyph context={target.context} size={21} />
        </View>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 22,
    paddingRight: 10,
    gap: 12,
  },
  label: { flex: 1, fontSize: 19, fontWeight: '600', letterSpacing: -0.3 },
  name: { fontWeight: '700' },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
