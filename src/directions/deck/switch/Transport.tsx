import { StyleSheet, Text, View } from 'react-native';

import { actions, useRunning, useSwitchTarget } from '@/core';

import { Print } from '../Body';
import { Square, Triangle } from '../Glyphs';
import { Key } from '../Key';
import { body, capDark, font } from '../theme';
import type { Program } from './program';

/**
 * The transport keys: the wide orange BACK TO / RESUME key, the most used control, and
 * STOP. Holding either brings out the rewind knob.
 */
export function Transport({ onRewind }: { onRewind: (program: Program) => void }) {
  const target = useSwitchTarget();
  const running = useRunning();
  const resume = target?.kind === 'resume';

  return (
    <View style={styles.row}>
      <Key
        color={body.accent}
        height={68}
        heavy
        style={{ flex: 1 }}
        disabled={!target}
        accessibilityLabel={target ? `${resume ? 'Resume' : 'Back to'} ${target.context.name}` : 'Nothing to go back to'}
        onPress={() => actions.back()}
        onLongPress={() => target && onRewind({ kind: 'back', contextId: target.context.id })}
        capStyle={styles.backCap}>
        <View style={styles.backTop}>
          {resume ? <Triangle dir="right" size={7} color="#FFFFFF" /> : <Triangle dir="left" size={7} color="#FFFFFF" />}
          <Print size={8} weight="bold" color="rgba(255,255,255,0.9)" spacing={1.4}>
            {resume ? 'RESUME' : 'BACK TO'}
          </Print>
        </View>
        <Text allowFontScaling={false} numberOfLines={1} style={styles.backName}>
          {target ? `${target.context.glyph ? `${target.context.glyph} ` : ''}${target.context.name.toLocaleUpperCase('en-GB')}` : 'NOTHING YET'}
        </Text>
      </Key>
      <Key
        color={capDark}
        height={68}
        width={96}
        heavy
        disabled={!running}
        accessibilityLabel="Stop"
        onPress={() => actions.stop()}
        onLongPress={() => running && onRewind({ kind: 'stop' })}
        capStyle={styles.stopCap}>
        <Square size={11} color={running ? '#FF5B45' : '#8D8983'} />
        <Print size={9} weight="bold" color="#F4F1EA" spacing={1.4}>
          STOP
        </Print>
      </Key>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  backCap: { paddingHorizontal: 16, justifyContent: 'center', gap: 6 },
  backTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  backName: { fontFamily: font.monoBold, fontSize: 17, color: '#FFFFFF', letterSpacing: 0.4 },
  stopCap: { alignItems: 'center', justifyContent: 'center', gap: 8 },
});
