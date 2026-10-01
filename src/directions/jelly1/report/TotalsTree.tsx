// The expandable tree of totals: every node includes its whole subtree. Rows with a
// weekly target show the target line; each row can copy its totals as plain text.

import * as Clipboard from 'expo-clipboard';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type ContextId, formatDuration, formatTargetLine, type TargetLine, type TotalsNode } from '@/core';

import { buzz } from '../feedback';
import { alpha, candy, colors, fonts } from '../theme';
import { say } from '../Toast';
import { CandySurface } from '../ui';

interface TotalsTreeProps {
  roots: TotalsNode[];
  expanded: ReadonlySet<ContextId>;
  onToggle: (id: ContextId) => void;
  targets: ReadonlyMap<ContextId, TargetLine>;
  /** Plain-text totals for one context, for the copy button. */
  textFor: (id: ContextId) => string;
}

export function TotalsTree({ roots, expanded, onToggle, targets, textFor }: TotalsTreeProps) {
  const max = Math.max(1, ...roots.map((r) => r.total));
  const rows: { node: TotalsNode; depth: number }[] = [];
  const walk = (nodes: TotalsNode[], depth: number) => {
    for (const node of nodes) {
      rows.push({ node, depth });
      if (expanded.has(node.context.id)) walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);

  return (
    <View style={styles.list}>
      {rows.map(({ node, depth }) => (
        <Row
          key={node.context.id}
          node={node}
          depth={depth}
          share={node.total / max}
          open={expanded.has(node.context.id)}
          onToggle={() => onToggle(node.context.id)}
          target={targets.get(node.context.id)}
          onCopy={() => {
            Clipboard.setStringAsync(textFor(node.context.id));
            buzz.success();
            say(`Copied ${node.context.name} totals`);
          }}
        />
      ))}
    </View>
  );
}

function Row({
  node,
  depth,
  share,
  open,
  onToggle,
  target,
  onCopy,
}: {
  node: TotalsNode;
  depth: number;
  share: number;
  open: boolean;
  onToggle: () => void;
  target?: TargetLine;
  onCopy: () => void;
}) {
  const c = candy[node.context.hue];
  const expandable = node.children.length > 0;
  return (
    <View style={[styles.row, { paddingLeft: 12 + depth * 20 }]}>
      <Pressable
        style={styles.main}
        onPress={expandable ? onToggle : undefined}
        accessibilityRole={expandable ? 'button' : undefined}
        accessibilityState={expandable ? { expanded: open } : undefined}
        accessibilityLabel={`${node.context.name}, ${formatDuration(node.total)}`}>
        <View style={styles.top}>
          <View style={styles.chevron}>
            {expandable && <SymbolView name={open ? 'chevron.down' : 'chevron.right'} size={12} tintColor={colors.muted} weight="heavy" />}
          </View>
          <CandySurface hue={node.context.hue} radius={13} flat style={styles.dot}>
            <Text style={styles.dotEmoji}>{node.context.glyph ?? ''}</Text>
          </CandySurface>
          <Text style={[styles.name, node.context.hidden && { color: colors.muted }]} numberOfLines={1}>
            {node.context.name}
            {node.context.hidden ? ' (archived)' : ''}
          </Text>
          <Text style={styles.total}>{formatDuration(node.total)}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.bar, { width: `${Math.max(2, share * 100)}%`, backgroundColor: c.fill }]} />
        </View>
        {target && (
          <Text style={[styles.target, { color: target.diff >= 0 ? candy.green.deep : colors.muted }]} numberOfLines={1}>
            {formatTargetLine(target)}
          </Text>
        )}
      </Pressable>
      <Pressable
        onPress={onCopy}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Copy ${node.context.name} totals`}
        style={({ pressed }) => [styles.copy, pressed && { backgroundColor: c.tint }]}>
        <SymbolView name="doc.on.doc" size={15} tintColor={colors.muted} weight="semibold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.card, borderRadius: 26, paddingVertical: 6, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: 6, paddingVertical: 7 },
  main: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { width: 12, alignItems: 'center' },
  dot: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  dotEmoji: { fontSize: 13 },
  name: { flex: 1, fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  total: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, fontVariant: ['tabular-nums'] },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: alpha(colors.ink, 0.05), marginTop: 6, marginLeft: 54, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  target: { fontFamily: fonts.textBold, fontSize: 13, marginTop: 4, marginLeft: 54, fontVariant: ['tabular-nums'] },
  copy: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
});
