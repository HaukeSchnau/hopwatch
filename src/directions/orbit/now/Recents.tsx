import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { type ContextId, useRecents } from '@/core';

import { alpha, font, neon, sky } from '../theme';
import { Label, Moon, Squish } from '../ui';

interface RecentsProps {
  selectedId: ContextId | null;
  onPress: (id: ContextId) => void;
  onLongPress: (id: ContextId) => void;
}

/** Recently used contexts as small moons, plus the way into the full tree. */
export function Recents({ selectedId, onPress, onLongPress }: RecentsProps) {
  const recents = useRecents(8);
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Label>{recents.length ? 'Recent' : ' '}</Label>
        <Squish onPress={() => router.push('/orbit/pick')} style={styles.all} accessibilityRole="button" scaleTo={0.95}>
          <Text style={styles.allText}>All contexts</Text>
          <SymbolView name="chevron.right" size={11} tintColor={sky.accent} weight="bold" />
        </Squish>
      </View>
      {recents.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {recents.map((context) => {
            const color = neon[context.hue];
            const selected = context.id === selectedId;
            return (
              <Squish
                key={context.id}
                onPress={() => onPress(context.id)}
                onLongPress={() => onLongPress(context.id)}
                delayLongPress={320}
                scaleTo={0.93}
                accessibilityRole="button"
                accessibilityLabel={`${context.name}. Long-press to start earlier.`}
                style={[
                  styles.chip,
                  selected && { borderColor: alpha(color, 0.7), backgroundColor: alpha(color, 0.14) },
                  selectedId !== null && !selected && { opacity: 0.4 },
                ]}>
                <Moon context={context} size={28} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {context.name}
                </Text>
              </Squish>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 22,
    paddingRight: 10,
  },
  all: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 12 },
  allText: { fontFamily: font.textBold, fontSize: 13, color: sky.accent },
  row: { gap: 8, paddingHorizontal: 18, paddingTop: 2 },
  chip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: sky.hairline,
    backgroundColor: 'rgba(20,24,36,0.7)',
    maxWidth: 200,
  },
  chipText: { fontFamily: font.textMedium, fontSize: 14, color: sky.text, flexShrink: 1 },
});
