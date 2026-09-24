import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import { MINUTE } from '@/core';

import { Aluminium, Groove, Print } from '../Body';
import { Key } from '../Key';
import { Lcd } from '../Lcd';
import { body, capDark, capNeutral, lcd } from '../theme';
import { Knob } from './Knob';

interface KnobPanelProps {
  minutes: number;
  /** An exact time from SET TIME, replacing the knob's minutes. */
  exact: number | null;
  max: number;
  /** Earliest time SET TIME may pick. */
  earliest: number;
  onMinutes: (minutes: number) => void;
  onExact: (at: number | null) => void;
  onCancel: () => void;
  onEnter: () => void;
}

const presets = [5, 10, 15, 30, 60];

/**
 * The rewind panel that slides up over the keypad: the knob, preset keys, and
 * CANCEL / SET TIME / ENTER. The main LCD above shows what will happen.
 */
export function KnobPanel({ minutes, exact, max, earliest, onMinutes, onExact, onCancel, onEnter }: KnobPanelProps) {
  const precise = exact !== null;
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20).stiffness(220)}
      exiting={SlideOutDown.duration(180)}
      style={styles.panel}>
      <Aluminium />
      <Groove style={styles.groove} />
      <View style={styles.header}>
        <Print size={9} weight="bold" color={body.ink}>
          REWIND
        </Print>
        <Print size={8}>{precise ? 'PICK THE EXACT TIME' : 'TURN LEFT · 5 MIN PER CLICK'}</Print>
      </View>
      <View style={styles.dial}>
        {precise ? (
          <Lcd style={styles.wheelLcd} pixels={false} contentStyle={styles.wheelContent}>
            <Host colorScheme="dark" seedColor={lcd.ink} style={styles.wheel}>
              <DatePicker
                selection={new Date(exact)}
                displayedComponents={['date', 'hourAndMinute']}
                range={{ start: new Date(earliest), end: new Date() }}
                onDateChange={(date) => onExact(date.getTime())}
                modifiers={[datePickerStyle('wheel'), labelsHidden(), tint(lcd.ink)]}
              />
            </Host>
          </Lcd>
        ) : (
          <Knob size={262} value={minutes} max={max} onChange={onMinutes} />
        )}
      </View>
      <View style={styles.presets}>
        {presets.map((p) => (
          <Key
            key={p}
            color={capNeutral}
            height={38}
            depth={5}
            radius={8}
            style={{ flex: 1 }}
            latched={!precise && minutes === p}
            disabled={p > max}
            onPress={() => {
              onExact(null);
              onMinutes(p);
            }}
            capStyle={styles.center}>
            <Print size={10} weight="bold" color={body.ink} spacing={0.5}>
              −{p}
            </Print>
          </Key>
        ))}
      </View>
      <View style={styles.actions}>
        <Key color={capNeutral} height={54} style={{ flex: 1 }} onPress={onCancel} capStyle={styles.center}>
          <Print size={10} weight="bold" color={body.ink}>
            CANCEL
          </Print>
        </Key>
        <Key
          color={capDark}
          height={54}
          style={{ flex: 1.1 }}
          onPress={() => onExact(precise ? null : Date.now() - minutes * MINUTE)}
          capStyle={styles.center}>
          <Print size={10} weight="bold" color="#F4F1EA">
            {precise ? 'KNOB' : 'SET TIME'}
          </Print>
        </Key>
        <Key color={body.accent} height={54} heavy style={{ flex: 1.4 }} onPress={onEnter} capStyle={styles.center}>
          <Print size={11} weight="bold" color="#FFFFFF" spacing={1.5}>
            ENTER
          </Print>
        </Key>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...StyleSheet.absoluteFill,
    backgroundColor: body.base,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
  },
  groove: { marginHorizontal: -16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12 },
  dial: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wheelLcd: { alignSelf: 'stretch', height: 236 },
  wheelContent: { justifyContent: 'center' },
  wheel: { height: 216, width: '100%' },
  presets: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
