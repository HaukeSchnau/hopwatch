import { StyleSheet, View } from 'react-native';

import { Print } from './Body';
import { Key } from './Key';
import { Lcd, LcdText } from './Lcd';
import { body, capNeutral, lcd } from './theme';

interface StepperProps {
  value: string;
  caption?: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
  /** The value reads dim, e.g. when inherited or off. */
  dim?: boolean;
}

/** − readout + : a value on a small display between two keys. */
export function Stepper({ value, caption, onMinus, onPlus, minusDisabled, plusDisabled, dim }: StepperProps) {
  return (
    <View style={styles.row}>
      <Key color={capNeutral} height={50} width={56} depth={6} radius={10} disabled={minusDisabled} onPress={onMinus} capStyle={styles.center}>
        <Print size={15} weight="bold" color={body.ink} spacing={0}>
          −
        </Print>
      </Key>
      <Lcd style={styles.lcd} contentStyle={styles.content}>
        <LcdText dot size={26} color={dim ? lcd.dim : lcd.hot} style={styles.value}>
          {value}
        </LcdText>
        {caption ? (
          <LcdText size={8} color={lcd.dim} numberOfLines={1} style={styles.caption}>
            {caption}
          </LcdText>
        ) : null}
      </Lcd>
      <Key color={capNeutral} height={50} width={56} depth={6} radius={10} disabled={plusDisabled} onPress={onPlus} capStyle={styles.center}>
        <Print size={15} weight="bold" color={body.ink} spacing={0}>
          +
        </Print>
      </Key>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  center: { alignItems: 'center', justifyContent: 'center' },
  lcd: { flex: 1, height: 50 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, gap: 8 },
  value: { lineHeight: 30 },
  caption: { flexShrink: 1, textAlign: 'right' },
});
