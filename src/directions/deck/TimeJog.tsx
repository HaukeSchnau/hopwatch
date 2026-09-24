import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatClock, isSameDay, MINUTE } from '@/core';

import { Print } from './Body';
import { detent } from './feedback';
import { Key } from './Key';
import { Lcd, LcdText } from './Lcd';
import { body, capNeutral, lcd } from './theme';

const dayLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' });

interface TimeJogProps {
  value: number;
  onChange: (at: number) => void;
  min?: number;
  max?: number;
  /** The day the readout is relative to; other days get a day label. */
  day: number;
}

/**
 * A time readout with −5 / +5 jog keys. Tapping the readout opens a wheel for any
 * time; the wheel commits on every change.
 */
export function TimeJog({ value, onChange, min, max, day }: TimeJogProps) {
  const [wheel, setWheel] = useState(false);
  const clamp = (t: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, t));
  const jog = (minutes: number) => {
    // Jogging lands on 5-minute marks, so 09:12 goes to 09:10 or 09:15.
    const step = 5 * MINUTE;
    const next = minutes < 0 ? Math.ceil(value / step) * step - step : Math.floor(value / step) * step + step;
    const clamped = clamp(next);
    if (clamped !== value) onChange(clamped);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Key color={capNeutral} height={52} width={58} depth={6} radius={10} disabled={min !== undefined && value <= min} onPress={() => jog(-5)} capStyle={styles.center}>
          <Print size={11} weight="bold" color={body.ink} spacing={0}>
            −5
          </Print>
        </Key>
        <Pressable
          style={styles.readoutWrap}
          onPress={() => {
            detent();
            setWheel((w) => !w);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Time ${formatClock(value)}, tap to pick`}>
          <Lcd style={styles.readout} pixels contentStyle={styles.readoutContent}>
            <LcdText dot size={30} color={lcd.hot} style={styles.digits}>
              {formatClock(value)}
            </LcdText>
            <LcdText size={8} color={lcd.dim}>
              {isSameDay(value, day) ? (wheel ? 'CLOSE' : 'SET') : dayLabel.format(value).toLocaleUpperCase('en-GB')}
            </LcdText>
          </Lcd>
        </Pressable>
        <Key color={capNeutral} height={52} width={58} depth={6} radius={10} disabled={max !== undefined && value >= max} onPress={() => jog(5)} capStyle={styles.center}>
          <Print size={11} weight="bold" color={body.ink} spacing={0}>
            +5
          </Print>
        </Key>
      </View>
      {wheel ? (
        <Lcd style={styles.wheelLcd} pixels={false} contentStyle={styles.wheelContent}>
          <Host colorScheme="dark" seedColor={lcd.ink} style={styles.wheel}>
            <DatePicker
              selection={new Date(value)}
              displayedComponents={['date', 'hourAndMinute']}
              range={{ start: min !== undefined ? new Date(min) : undefined, end: max !== undefined ? new Date(max) : undefined }}
              onDateChange={(date) => onChange(clamp(date.getTime()))}
              modifiers={[datePickerStyle('wheel'), labelsHidden(), tint(lcd.ink)]}
            />
          </Host>
        </Lcd>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  center: { alignItems: 'center', justifyContent: 'center' },
  readoutWrap: { flex: 1 },
  readout: { height: 52 },
  readoutContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  digits: { lineHeight: 34 },
  wheelLcd: { height: 200 },
  wheelContent: { justifyContent: 'center' },
  wheel: { height: 180, width: '100%' },
});
