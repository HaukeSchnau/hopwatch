import { DatePicker, Host } from '@expo/ui/swift-ui';
import { datePickerStyle, environment, labelsHidden, tint } from '@expo/ui/swift-ui/modifiers';

/**
 * A native compact time (or date and time) field in Orbit's dark scheme with a
 * 24-hour clock. The host matches the SwiftUI content's size, so it lines up with
 * the RN layout around it.
 */
export function TimeField({
  value,
  onChange,
  color,
  withDate = false,
  min,
  max,
}: {
  value: number;
  onChange: (ts: number) => void;
  color: string;
  withDate?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <Host matchContents>
      <DatePicker
        selection={new Date(value)}
        displayedComponents={withDate ? ['date', 'hourAndMinute'] : ['hourAndMinute']}
        range={min !== undefined || max !== undefined ? { start: min === undefined ? undefined : new Date(min), end: max === undefined ? undefined : new Date(max) } : undefined}
        onDateChange={(date) => onChange(date.getTime())}
        modifiers={[
          datePickerStyle('compact'),
          labelsHidden(),
          tint(color),
          environment('colorScheme', 'dark'),
          environment('locale', 'en_GB'),
        ]}
      />
    </Host>
  );
}
