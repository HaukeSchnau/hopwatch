// The day-off pill on iOS: a small bordered capsule that opens a native menu. Logic and
// choices: dayOff.ts. Android: DayOffPill.android.tsx.

import { Button, Host, Menu } from '@expo/ui/swift-ui';
import { buttonBorderShape, buttonStyle, controlSize, tint } from '@expo/ui/swift-ui/modifiers';

import { useTheme } from '../theme';
import { dayOffChoices, useDayOffPill } from './dayOff';

export function DayOffPill({ dayStart }: { dayStart: number }) {
  const t = useTheme();
  const pill = useDayOffPill(dayStart);
  if (!pill.shown) return null;
  return (
    <Host matchContents>
      <Menu
        label={pill.label}
        modifiers={[buttonStyle('bordered'), buttonBorderShape('capsule'), controlSize('small'), tint(pill.off ? t.c.pinkDeep : t.c.muted)]}>
        {dayOffChoices(pill.kind).map((choice) => (
          <Button
            key={choice.kind ?? 'workday'}
            label={choice.title}
            systemImage={choice.kind !== null && choice.kind === pill.kind ? 'checkmark' : undefined}
            onPress={() => pill.set(choice.kind)}
          />
        ))}
      </Menu>
    </Host>
  );
}
