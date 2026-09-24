import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';

import { MINUTE } from '@/core';

import { ink } from './theme';

/** Rounds down to the previous 5-minute mark, the grain every picker starts on. */
export const floorTo5 = (ts: number) => Math.floor(ts / (5 * MINUTE)) * 5 * MINUTE;

/**
 * The native date-and-time wheel, set on the paper without a card behind it. `min`
 * and `max` clamp the choice, e.g. an entry's start and now for a backdated stop.
 */
export function TimeWheel({
  value,
  onChange,
  min,
  max,
  withDate = true,
  height = 180,
}: {
  value: number;
  onChange: (ts: number) => void;
  min?: number;
  max?: number;
  withDate?: boolean;
  height?: number;
}) {
  return (
    <Host colorScheme="light" seedColor={ink.full} style={{ height, alignSelf: 'stretch' }}>
      <DatePicker
        selection={new Date(value)}
        range={{
          start: min === undefined ? undefined : new Date(min),
          end: max === undefined ? undefined : new Date(max),
        }}
        displayedComponents={withDate ? ['date', 'hourAndMinute'] : ['hourAndMinute']}
        modifiers={[datePickerStyle('wheel')]}
        onDateChange={(date) => onChange(date.getTime())}
      />
    </Host>
  );
}
