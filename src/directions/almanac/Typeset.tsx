import type { ReactNode } from 'react';
import { type StyleProp, StyleSheet, type TextStyle, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

/** One word (or figure) of a headline, with its own face or color. */
export interface Token {
  text: ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * Sets a headline word by word. Each word drops into place with a short stagger, like
 * slugs going into a composing stick. Remount it (change `key`) to set it again.
 */
export function Typeset({
  tokens,
  style,
  animate = true,
}: {
  tokens: Token[];
  style: StyleProp<TextStyle>;
  animate?: boolean;
}) {
  return (
    <View style={styles.line}>
      {tokens.map((token, i) => (
        <Animated.Text
          key={i}
          entering={
            animate
              ? FadeInDown.delay(40 + i * 32)
                  .duration(300)
                  .easing(Easing.out(Easing.cubic))
                  .withInitialValues({ opacity: 0, transform: [{ translateY: -9 }] })
              : undefined
          }
          style={[style, token.style]}>
          {token.text}
          {i < tokens.length - 1 ? ' ' : ''}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
});
