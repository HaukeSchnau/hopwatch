import { MenuView } from '@expo/ui/community/menu';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { type ContextId, formatDuration, type Totals, type TotalsNode, totalsText, useEntries, useTree } from '@/core';

import { Glass } from '../Glass';
import { Glyph } from '../Glyph';
import { numeric, useTheme } from '../theme';

/**
 * The expandable tree of totals. Every row includes its whole subtree, archived nodes
 * too. Tap a row with children to expand it; long-press to copy its totals as text.
 */
export function TotalsTree({ totals, range, onCopied }: { totals: Totals; range: { start: number; end: number }; onCopied: (name: string) => void }) {
  const [open, setOpen] = useState<ReadonlySet<ContextId>>(new Set());
  const theme = useTheme();
  const max = Math.max(...totals.roots.map((r) => r.total), 1);
  const toggle = (id: ContextId) => {
    Haptics.selectionAsync();
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  const rows: { node: TotalsNode; depth: number }[] = [];
  const walk = (nodes: TotalsNode[], depth: number) => {
    for (const node of nodes) {
      rows.push({ node, depth });
      if (open.has(node.context.id)) walk(node.children, depth + 1);
    }
  };
  walk(totals.roots, 0);

  if (rows.length === 0) {
    return (
      <Glass style={styles.card}>
        <Text style={[styles.empty, { color: theme.secondary }]}>Nothing tracked in this period.</Text>
      </Glass>
    );
  }

  return (
    <Glass style={styles.card}>
      {rows.map(({ node, depth }, index) => (
        <Animated.View key={node.context.id} entering={FadeIn.duration(220)} layout={LinearTransition.duration(220)}>
          <Row
            node={node}
            depth={depth}
            max={max}
            first={index === 0}
            expanded={open.has(node.context.id)}
            onToggle={() => toggle(node.context.id)}
            range={range}
            onCopied={onCopied}
          />
        </Animated.View>
      ))}
    </Glass>
  );
}

function Row({
  node,
  depth,
  max,
  first,
  expanded,
  onToggle,
  range,
  onCopied,
}: {
  node: TotalsNode;
  depth: number;
  max: number;
  first: boolean;
  expanded: boolean;
  onToggle: () => void;
  range: { start: number; end: number };
  onCopied: (name: string) => void;
}) {
  const theme = useTheme();
  const entries = useEntries();
  const tree = useTree();
  // The native menu host sizes to its content, so the row needs an explicit width.
  const { width } = useWindowDimensions();
  const hue = theme.hue(node.context.hue);
  const hasChildren = node.children.length > 0;
  const copy = () => {
    Clipboard.setStringAsync(totalsText(entries, tree, node.context.id, range, Date.now()));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCopied(node.context.name);
  };
  return (
    <MenuView
      shouldOpenOnLongPress
      title={`${node.context.name} · ${formatDuration(node.total)}`}
      actions={[{ id: 'copy', title: 'Copy Totals', image: 'doc.on.doc' }]}
      onPressAction={copy}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${node.context.name}, ${formatDuration(node.total)}`}
        accessibilityHint={hasChildren ? 'Shows what it contains. Long-press to copy totals.' : 'Long-press to copy totals.'}
        onPress={hasChildren ? onToggle : undefined}
        style={({ pressed }) => [styles.row, { width: width - 32, paddingLeft: 14 + depth * 20 }, pressed && hasChildren && { backgroundColor: theme.fill }]}>
        <View style={styles.chevron}>
          {hasChildren ? (
            <SymbolView name={expanded ? 'chevron.down' : 'chevron.right'} size={12} weight="bold" tintColor={theme.tertiary} />
          ) : null}
        </View>
        <View style={styles.emoji}>
          <Glyph context={node.context} size={20} />
        </View>
        <View style={[styles.body, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
          <View style={styles.line}>
            <Text style={[styles.name, { color: node.context.hidden ? theme.secondary : theme.label }]} numberOfLines={1}>
              {node.context.name}
              {node.context.archivedAt ? <Text style={{ color: theme.tertiary }}>  archived</Text> : null}
            </Text>
            <Text style={[numeric, styles.total, { color: theme.label }]}>{formatDuration(node.total)}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.fill }]}>
            <View style={[styles.fill, { width: `${Math.max(2, (node.total / max) * 100)}%`, backgroundColor: hue.solid }]} />
          </View>
        </View>
      </Pressable>
    </MenuView>
  );
}

/**
 * "Copy Totals": a visible button whose native menu lists every context with time in
 * the period. Picking one copies its subtree's totals as plain text, e.g. for a client.
 */
export function CopyTotalsButton({ totals, range, onCopied }: { totals: Totals; range: { start: number; end: number }; onCopied: (name: string) => void }) {
  const theme = useTheme();
  const entries = useEntries();
  const tree = useTree();
  const flat: TotalsNode[] = [];
  const walk = (nodes: TotalsNode[]) => {
    for (const node of nodes) {
      flat.push(node);
      walk(node.children);
    }
  };
  walk(totals.roots);
  if (flat.length === 0) return null;
  return (
    <MenuView
      title="Copy totals as text"
      actions={flat.map((node) => ({
        id: node.context.id,
        title: `${'   '.repeat(node.context.depth)}${node.context.glyph ?? ''} ${node.context.name} · ${formatDuration(node.total)}`,
      }))}
      onPressAction={({ nativeEvent }) => {
        const node = flat.find((n) => n.context.id === nativeEvent.event);
        if (!node) return;
        Clipboard.setStringAsync(totalsText(entries, tree, node.context.id, range, Date.now()));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onCopied(node.context.name);
      }}>
      <Glass interactive style={styles.copy}>
        <SymbolView name="doc.on.doc" size={15} weight="semibold" tintColor={theme.label} />
        <Text style={[styles.copyText, { color: theme.label }]}>Copy Totals</Text>
      </Glass>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  copy: { height: 36, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { fontSize: 15, fontWeight: '600' },
  card: { borderRadius: 26, overflow: 'hidden', paddingVertical: 4 },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingRight: 16 },
  chevron: { width: 16, alignItems: 'center' },
  emoji: { width: 34, alignItems: 'center' },
  body: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 6, paddingVertical: 10, marginLeft: 6 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: 17, letterSpacing: -0.4 },
  total: { fontSize: 17, fontWeight: '600' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
});
