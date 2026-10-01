// The running entry as a Live Activity: Lock Screen banner and Dynamic Island, drawn in
// Jelly's palette. `live-activity.ts` starts, updates and ends it from the store.
//
// The layout function carries the 'widget' directive: Babel turns it into a string that
// runs in the widget extension's own JavaScript runtime. It can only use @expo/ui
// components and modifiers, imported under their own names (they are globals there), and
// nothing else from module scope. Everything it shows comes in through the props.

import { Capsule, HStack, Image, Link, RoundedRectangle, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  background,
  font,
  foregroundStyle,
  frame,
  layoutPriority,
  lineLimit,
  monospacedDigit,
  multilineTextAlignment,
  offset,
  opacity,
  padding,
  shapes,
  truncationMode,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';
import type { ColorValue } from 'react-native';

/**
 * Lock Screen colors from Jelly's theme, each a DynamicColorIOS pair for day and night.
 * The system resolves them against the Lock Screen's appearance. expo-widgets 57 always
 * reports `environment.colorScheme` as light, so the layout can't pick a palette itself.
 */
export interface ActivityPaint {
  bg: ColorValue;
  ink: ColorValue;
  muted: ColorValue;
  /** The context's hue as text on `bg`. */
  accent: ColorValue;
  /** A pale wash of the hue, behind "Back to". */
  wash: ColorValue;
  /** The Stop pill and its label. */
  stop: ColorValue;
  onStop: ColorValue;
}

/** What the activity shows. Plain JSON, since ActivityKit stores it as the content state. */
export interface RunningActivityProps {
  /** The context's emoji, or its initial when it has none. */
  mark: string;
  name: string;
  /** The ancestors, "Work" for "Work › Deep work". Null for a root context. */
  path: string | null;
  /** The entry's start in epoch ms. The system timer counts up from it without updates. */
  since: number;
  /** The context "Back to" starts (stint://resume), null when there is none. */
  back: string | null;
  /** The gummy's gradient from top to bottom, and `on` for an initial drawn on it. */
  candy: { light: string; fill: string; deep: string; on: string };
  paint: ActivityPaint;
}

function RunningActivity(props: RunningActivityProps) {
  'widget';
  const paint = props.paint;
  const since = new Date(props.since);
  const rounded = (size: number, weight: 'semibold' | 'bold' | 'heavy') => font({ design: 'rounded', size, weight });

  // A jelly bean in the context's hue with its emoji, and a glossy highlight on top.
  const gummy = (size: number) => (
    <ZStack modifiers={[frame({ width: size, height: size })]}>
      <RoundedRectangle
        cornerRadius={size * 0.38}
        modifiers={[
          foregroundStyle({
            type: 'linearGradient',
            colors: [props.candy.light, props.candy.fill, props.candy.deep],
            startPoint: { x: 0.5, y: 0 },
            endPoint: { x: 0.5, y: 1 },
          }),
        ]}
      />
      <Capsule
        modifiers={[
          foregroundStyle('#FFFFFF'),
          opacity(0.45),
          frame({ width: size * 0.36, height: size * 0.13 }),
          offset({ x: -size * 0.15, y: -size * 0.3 }),
        ]}
      />
      <Text modifiers={[font({ size: size * 0.5, weight: 'bold', design: 'rounded' }), foregroundStyle(props.candy.on)]}>
        {props.mark}
      </Text>
    </ZStack>
  );

  // h:mm:ss counting up from the start, ticked by the system. A system timer claims all
  // the width it gets, so it needs a fixed width, or a minimum and the trailing edge.
  const timer = (size: number, color: ColorValue, width: number | null, weight: 'bold' | 'heavy' = 'heavy') => (
    <Text
      date={since}
      dateStyle="timer"
      modifiers={[
        rounded(size, weight),
        monospacedDigit(),
        foregroundStyle(color),
        multilineTextAlignment('trailing'),
        width === null
          ? frame({ minWidth: size * 3.9, maxWidth: Infinity, alignment: 'trailing' })
          : frame({ width, alignment: 'trailing' }),
      ]}
    />
  );

  // "Clients › Acme ›" over "Website". Where space is tight, `cut` keeps the nearest parent.
  const titles = (ink: ColorValue, muted: ColorValue, cut: 'head' | 'tail') => (
    <VStack alignment="leading" spacing={1} modifiers={[layoutPriority(1)]}>
      {props.path ? (
        <Text modifiers={[rounded(13, 'semibold'), foregroundStyle(muted), lineLimit(1), truncationMode(cut)]}>
          {`${props.path} ›`}
        </Text>
      ) : null}
      <Text modifiers={[rounded(17, 'bold'), foregroundStyle(ink), lineLimit(1)]}>{props.name}</Text>
    </VStack>
  );

  // Links open the app on a deep link, which stops or switches and lands on Now.
  const pill = (url: string, symbol: 'stop.fill' | 'arrow.uturn.backward', label: string, fill: ColorValue, color: ColorValue) => (
    <Link
      destination={url}
      modifiers={[
        padding({ horizontal: 14, vertical: 8 }),
        background(fill, shapes.capsule()),
      ]}>
      <HStack spacing={6}>
        <Image systemName={symbol} size={12} color={color} />
        <Text modifiers={[rounded(15, 'bold'), foregroundStyle(color), lineLimit(1)]}>{label}</Text>
      </HStack>
    </Link>
  );

  const buttons = (p: Pick<ActivityPaint, 'stop' | 'onStop' | 'wash' | 'accent'>) => (
    <HStack spacing={8}>
      {pill('stint://stop', 'stop.fill', 'Stop', p.stop, p.onStop)}
      {props.back ? pill('stint://resume', 'arrow.uturn.backward', `Back to ${props.back}`, p.wash, p.accent) : null}
    </HStack>
  );

  // The Dynamic Island is always black, so it uses the hue's light tone on white text.
  const island = { stop: '#FFFFFF', onStop: '#150F1D', wash: '#2A2333', accent: props.candy.light };

  return {
    banner: (
      <VStack
        alignment="leading"
        spacing={12}
        modifiers={[
          padding({ all: 16 }),
          frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
          background(paint.bg),
          activityBackgroundTint(paint.bg),
        ]}>
        <HStack spacing={12}>
          {gummy(46)}
          {titles(paint.ink, paint.muted, 'tail')}
          {timer(30, paint.accent, null)}
        </HStack>
        {buttons(paint)}
      </VStack>
    ),
    compactLeading: gummy(24),
    // The compact island leaves about 56pt here; bold 13pt fits h:mm:ss.
    compactTrailing: timer(13, props.candy.light, 56, 'bold'),
    minimal: gummy(22),
    expandedLeading: <HStack modifiers={[padding({ leading: 4, top: 4 })]}>{gummy(44)}</HStack>,
    expandedCenter: <HStack modifiers={[padding({ top: 4 })]}>{titles('#FFFFFF', '#A99BB8', 'head')}</HStack>,
    expandedTrailing: <HStack modifiers={[padding({ trailing: 4, top: 4 })]}>{timer(26, props.candy.light, 110)}</HStack>,
    expandedBottom: <HStack modifiers={[padding({ top: 6 })]}>{buttons(island)}</HStack>,
  };
}

/** Starts, finds and ends running-entry activities. */
export const runningActivity = createLiveActivity<RunningActivityProps>('RunningActivity', RunningActivity);
