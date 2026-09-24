import type { BottomTabBarProps } from 'expo-router/tabs';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Groove, Print } from './Body';
import { Key } from './Key';
import { Led } from './Led';
import { body, capNeutral } from './theme';

export const modes = [
  { route: 'index', label: 'SWITCH' },
  { route: 'log', label: 'LOG' },
  { route: 'stats', label: 'STATS' },
  { route: 'tree', label: 'TREE' },
  { route: 'sys', label: 'SYS' },
] as const;
type ModeRoute = (typeof modes)[number]['route'];

/**
 * The row of function keys at the bottom of the device. The active mode's key stays
 * latched down with its LED lit.
 */
export function ModeBar({ state, navigation, insets }: BottomTabBarProps) {
  const activeName = state.routes[state.index]?.name;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom - 6, 10) }]}>
      <Groove style={styles.groove} />
      <View style={styles.row}>
        {modes.map((mode) => {
          const active = activeName === mode.route;
          return (
            <View key={mode.route} style={styles.slot}>
              <View style={styles.label}>
                <Led on={active} size={5} />
                <Print size={7.5} weight={active ? 'bold' : 'medium'} color={active ? body.ink : body.ink2}>
                  {mode.label}
                </Print>
              </View>
              <Key
                color={capNeutral}
                height={40}
                depth={6}
                radius={9}
                latched={active}
                accessibilityLabel={mode.label}
                onPress={() => {
                  if (!active) navigation.navigate(mode.route);
                }}
                capStyle={styles.cap}>
                <ModeGlyph route={mode.route} />
              </Key>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const ink = body.ink;

/** Simple printed pictograms, one per mode. */
function ModeGlyph({ route }: { route: ModeRoute }) {
  const stroke = { stroke: ink, strokeWidth: 1.8, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <Svg width={22} height={18} viewBox="0 0 22 18">
      {route === 'index' && (
        <>
          <Path d="M3 6 H18 M14.5 2.5 L18 6 L14.5 9.5" {...stroke} strokeLinejoin="round" />
          <Path d="M19 12 H4 M7.5 8.5 L4 12 L7.5 15.5" {...stroke} strokeLinejoin="round" />
        </>
      )}
      {route === 'log' && (
        <>
          <Rect x={7} y={1.5} width={8} height={15} rx={1.5} {...stroke} />
          <Rect x={7} y={4} width={8} height={4} fill={ink} />
          <Rect x={7} y={10.5} width={8} height={3} fill={ink} />
          <Path d="M2 9 H6" {...stroke} stroke={body.accent} />
        </>
      )}
      {route === 'stats' && (
        <>
          <Path d="M4 16 V9 M9 16 V3 M14 16 V7 M19 16 V11" {...stroke} strokeWidth={2.6} />
        </>
      )}
      {route === 'tree' && (
        <>
          <Path d="M5 3 V14 H10 M5 8.5 H10" {...stroke} />
          <Rect x={11} y={6.5} width={6} height={4} rx={1} fill={ink} />
          <Rect x={11} y={12} width={6} height={4} rx={1} fill={ink} />
          <Circle cx={5} cy={2.5} r={1.8} fill={ink} />
        </>
      )}
      {route === 'sys' && (
        <>
          <Path d="M3 4 H19 M3 9 H19 M3 14 H19" {...stroke} strokeWidth={1.2} />
          <Rect x={12} y={2} width={3} height={4} rx={1} fill={ink} />
          <Rect x={6} y={7} width={3} height={4} rx={1} fill={ink} />
          <Rect x={14} y={12} width={3} height={4} rx={1} fill={ink} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingTop: 0 },
  groove: { marginHorizontal: -16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  slot: { flex: 1, gap: 6 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 2 },
  cap: { alignItems: 'center', justifyContent: 'center' },
});
