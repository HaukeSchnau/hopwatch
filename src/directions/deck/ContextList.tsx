import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ContextId, ResolvedContext } from '@/core';

import { detent } from './feedback';
import { Triangle } from './Glyphs';
import { LcdText } from './Lcd';
import { lcd, screenColor } from './theme';
import { type Connector, type Guide, treeRows } from './treeRows';

export const ROW_HEIGHT = 46;
const LEVEL = 16;

interface ContextListProps {
  /** Depth-first, ancestors included, e.g. usePickableContexts(). */
  contexts: readonly ResolvedContext[];
  onPick: (context: ResolvedContext) => void;
  onLongPress?: (context: ResolvedContext) => void;
  /** Drawn inverted, like a cursor on the display. */
  selectedId?: ContextId | null;
  runningId?: ContextId | null;
  disabled?: (context: ResolvedContext) => boolean;
  /** Small print on the right, e.g. "P03". */
  meta?: (context: ResolvedContext) => string | null;
  trailing?: (context: ResolvedContext) => ReactNode;
}

/**
 * The context tree as a file browser on the display: indentation guides, a color pixel,
 * the emoji and the name. Used by every picker and by TREE.
 */
export function ContextList({ contexts, onPick, onLongPress, selectedId, runningId, disabled, meta, trailing }: ContextListProps) {
  return (
    <View>
      {treeRows(contexts).map(({ context, guides, connector }) => {
        const selected = context.id === selectedId;
        const off = disabled?.(context) ?? false;
        const ink = selected ? lcd.glass : context.hidden ? lcd.faint : lcd.ink;
        const note = meta?.(context);
        return (
          <View key={context.id} style={[styles.row, selected && styles.selected]}>
            <Pressable
              style={styles.main}
              disabled={off}
              onPress={() => {
                detent();
                onPick(context);
              }}
              onLongPress={onLongPress ? () => onLongPress(context) : undefined}
              accessibilityRole="button"
              accessibilityLabel={context.name}>
              <Guides guides={guides} connector={connector} color={selected ? 'rgba(15,14,13,0.4)' : lcd.line} />
              <View style={[styles.pixel, { backgroundColor: screenColor[context.hue], opacity: off || context.hidden ? 0.35 : 1 }]} />
              {context.glyph ? (
                <Text allowFontScaling={false} style={[styles.emoji, (off || context.hidden) && styles.faded]}>
                  {context.glyph}
                </Text>
              ) : null}
              <LcdText size={11.5} color={off ? lcd.faint : ink} glow={!selected && !off} numberOfLines={1} style={styles.name}>
                {context.name.toLocaleUpperCase('en-GB')}
              </LcdText>
              {context.id === runningId ? <Triangle dir="right" size={7} color={selected ? lcd.glass : lcd.hot} /> : null}
              {note ? (
                <LcdText size={8.5} color={selected ? lcd.glass : lcd.dim} glow={false}>
                  {note}
                </LcdText>
              ) : null}
            </Pressable>
            {trailing?.(context)}
          </View>
        );
      })}
    </View>
  );
}

export function Guides({ guides, connector, color }: { guides: Guide[]; connector: Connector | null; color: string }) {
  if (connector === null) return null;
  return (
    <View style={styles.guides}>
      {guides.map((g, i) => (
        <View key={i} style={styles.level}>
          {g === 'pipe' ? <View style={[styles.vertical, { backgroundColor: color }]} /> : null}
        </View>
      ))}
      <View style={styles.level}>
        <View style={[styles.vertical, connector === 'elbow' && styles.half, { backgroundColor: color }]} />
        <View style={[styles.horizontal, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: ROW_HEIGHT, paddingHorizontal: 10 },
  selected: { backgroundColor: lcd.ink },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: ROW_HEIGHT },
  guides: { flexDirection: 'row', alignSelf: 'stretch', marginRight: -2 },
  level: { width: LEVEL, alignSelf: 'stretch' },
  vertical: { position: 'absolute', left: LEVEL / 2 - 0.5, top: 0, bottom: 0, width: 1 },
  half: { bottom: '50%' },
  horizontal: { position: 'absolute', left: LEVEL / 2, right: 0, top: '50%', height: 1 },
  pixel: { width: 8, height: 8 },
  emoji: { fontSize: 15 },
  faded: { opacity: 0.4 },
  name: { flex: 1 },
});
