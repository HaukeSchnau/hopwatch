// "Back to Job": the most prominent control on Now, a big gummy pill in the color of
// the context it returns to. Reads "Resume Job" when nothing runs. Hold it for the
// native backdating menu.

import { MenuView } from '@expo/ui/community/menu';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { actions, useNow, useSwitchTarget } from '@/core';

import { onStartMenu, startMenu } from '../menus';
import { useTheme } from '../theme';
import { CandySurface, Squishy } from '../ui';
import { noteSource, useAnchor } from './choreo';

export function BackPill() {
  const t = useTheme();
  const target = useSwitchTarget();
  const anchor = useAnchor('back');
  const now = useNow(60_000);
  const { width } = useWindowDimensions();
  if (!target) return null;
  const { kind, context } = target;
  const c = t.candy[context.hue];
  const verb = kind === 'back' ? 'Back to' : 'Resume';
  return (
    <View style={styles.wrap}>
      <MenuView
        shouldOpenOnLongPress
        title={`${verb} ${context.name}`}
        actions={startMenu(context, now, false)}
        onPressAction={(e) => onStartMenu(context.id, e.nativeEvent.event, 'back')}>
        <Squishy
          amount={0.07}
          style={{ width: width - 32 }}
          accessibilityRole="button"
          accessibilityLabel={`${verb} ${context.name}`}
          accessibilityHint="Hold to start it at an earlier time"
          onPress={() => {
            noteSource(context.id, 'back');
            actions.back();
          }}>
          <CandySurface hue={context.hue} radius={32} style={styles.pill}>
            <View ref={anchor} style={styles.badge}>
              <Text style={styles.emoji} allowFontScaling={false}>
                {context.glyph ?? '🍬'}
              </Text>
            </View>
            <Text style={[styles.label, { color: c.on }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              <Text style={styles.verb}>{verb} </Text>
              {context.name}
            </Text>
            <View style={styles.icon}>
              <SymbolView name={kind === 'back' ? 'arrow.uturn.backward' : 'play.fill'} size={17} tintColor={c.on} weight="heavy" />
            </View>
          </CandySurface>
        </Squishy>
      </MenuView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pill: { height: 64, flexDirection: 'row', alignItems: 'center', paddingLeft: 9, paddingRight: 12, gap: 12 },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  label: { flex: 1, fontFamily: 'ui-rounded', fontWeight: '800', fontSize: 22, letterSpacing: -0.2 },
  verb: { fontWeight: '600' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.28)' },
});
