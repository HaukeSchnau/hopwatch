import { Pressable, StyleSheet, View } from 'react-native';

import { type ContextId, formatDuration, type Totals, type TotalsNode } from '@/core';

import { Guides } from '../ContextList';
import { detent } from '../feedback';
import { Triangle } from '../Glyphs';
import { LcdText } from '../Lcd';
import { lcd, screenColor } from '../theme';
import type { Connector, Guide } from '../treeRows';
import { Meter } from './Meter';

interface Row {
  node: TotalsNode;
  guides: Guide[];
  connector: Connector | null;
  open: boolean;
}

/** Visible rows of the totals tree, children only under expanded nodes. */
function rowsOf(roots: TotalsNode[], expanded: ReadonlySet<ContextId>): Row[] {
  const rows: Row[] = [];
  const walk = (nodes: TotalsNode[], depth: number, guides: Guide[]) => {
    nodes.forEach((node, i) => {
      const last = i === nodes.length - 1;
      const open = expanded.has(node.context.id) && node.children.length > 0;
      rows.push({ node, guides, connector: depth === 0 ? null : last ? 'elbow' : 'tee', open });
      if (open) walk(node.children, depth + 1, depth === 0 ? [] : [...guides, last ? 'blank' : 'pipe']);
    });
  };
  walk(roots, 0, []);
  return rows;
}

interface TotalsTreeProps {
  totals: Totals;
  expanded: ReadonlySet<ContextId>;
  cursor: ContextId | null;
  onRow: (id: ContextId) => void;
}

/**
 * Totals rolled up over the tree, each with a segmented meter scaled to the largest
 * root. Tapping a row moves the cursor there (for COPY) and opens or closes it.
 */
export function TotalsTree({ totals, expanded, cursor, onRow }: TotalsTreeProps) {
  const max = Math.max(1, ...totals.roots.map((r) => r.total));
  return (
    <View>
      {rowsOf(totals.roots, expanded).map(({ node, guides, connector, open }) => {
        const selected = node.context.id === cursor;
        const ink = selected ? lcd.glass : lcd.ink;
        const hasChildren = node.children.length > 0;
        return (
          <View key={node.context.id}>
            <Pressable
              style={[styles.row, selected && styles.selected]}
              onPress={() => {
                detent();
                onRow(node.context.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${node.context.name} ${formatDuration(node.total)}`}>
              <Guides guides={guides} connector={connector} color={selected ? 'rgba(15,14,13,0.4)' : lcd.line} />
              <View style={styles.caret}>
                {hasChildren ? <Triangle dir={open ? 'down' : 'right'} size={6} color={selected ? lcd.glass : lcd.dim} /> : null}
              </View>
              <View style={[styles.pixel, { backgroundColor: screenColor[node.context.hue] }]} />
              <LcdText size={10.5} color={ink} glow={!selected} numberOfLines={1} style={styles.name}>
                {node.context.name.toLocaleUpperCase('en-GB')}
              </LcdText>
              <Meter value={node.total / max} segments={8} color={selected ? lcd.glass : screenColor[node.context.hue]} height={8} />
              <LcdText size={10.5} color={ink} glow={!selected} style={styles.duration}>
                {formatDuration(node.total)}
              </LcdText>
            </Pressable>
            {open && node.own > 0 ? (
              <View style={[styles.row, styles.ownRow]}>
                <LcdText size={9} color={lcd.dim} glow={false} style={styles.name}>
                  · {node.context.name.toLocaleUpperCase('en-GB')} ITSELF
                </LcdText>
                <LcdText size={9} color={lcd.dim} glow={false} style={styles.duration}>
                  {formatDuration(node.own)}
                </LcdText>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 40, gap: 7, paddingHorizontal: 10 },
  selected: { backgroundColor: lcd.ink },
  ownRow: { height: 26, paddingLeft: 48 },
  caret: { width: 10, alignItems: 'center' },
  pixel: { width: 8, height: 8 },
  name: { flex: 1 },
  duration: { width: 50, textAlign: 'right' },
});
