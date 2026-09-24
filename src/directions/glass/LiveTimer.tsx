import { Host, HStack, Text as SwiftText } from '@expo/ui/swift-ui';
import { Animation, animation, contentTransition, font, foregroundStyle, kerning, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import { type StyleProp, Text, type TextStyle } from 'react-native';

import { durationParts, useNow } from '@/core';

import { numeric } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A ticking h:mm duration since `since`, with the seconds as a smaller flourish.
 * Re-renders every second on its own, so its parent doesn't.
 */
export function LiveTimer({
  since,
  style,
  secondsStyle,
}: {
  since: number;
  style?: StyleProp<TextStyle>;
  secondsStyle?: StyleProp<TextStyle>;
}) {
  const now = useNow(1000);
  const { hours, minutes, seconds } = durationParts(now - since);
  return (
    <Text style={[numeric, style]} numberOfLines={1}>
      {hours}:{pad(minutes)}
      <Text style={secondsStyle}>:{pad(seconds)}</Text>
    </Text>
  );
}

/**
 * The hero timer, drawn by SwiftUI so every tick rolls its digits with the system's
 * numeric text transition, like the Clock app. Seconds are the smaller flourish.
 */
export function RollingTimer({ since }: { since: number }) {
  const now = useNow(1000);
  const { hours, minutes, seconds } = durationParts(now - since);
  const roll = [contentTransition('numericText'), animation(Animation.spring({ duration: 0.45, bounce: 0.2 }), Math.floor(now / 1000))];
  return (
    <Host matchContents>
      <HStack alignment="firstTextBaseline" spacing={0}>
        <SwiftText modifiers={[font({ size: 68, weight: 'semibold', design: 'rounded' }), monospacedDigit(), kerning(-1.5), foregroundStyle({ type: 'hierarchical', style: 'primary' }), ...roll]}>
          {`${hours}:${pad(minutes)}`}
        </SwiftText>
        <SwiftText modifiers={[font({ size: 30, weight: 'medium', design: 'rounded' }), monospacedDigit(), foregroundStyle({ type: 'hierarchical', style: 'tertiary' }), ...roll]}>
          {`:${pad(seconds)}`}
        </SwiftText>
      </HStack>
    </Host>
  );
}
