import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type ContextId, formatDuration, type Totals, type TotalsNode, totalsText, useStint } from '@/core';

import { Guides } from '../ContextPicker';
import { alpha, font, neon, sky } from '../theme';
import { IconButton } from '../ui';

interface TotalsTreeProps {
  totals: Totals;
  range: { start: number; end: number };
  now: number;
}

/**
 * Totals rolled up the tree as glowing bars. Every row includes its subtree; tapping
 * a row with children expands it; the copy button puts that context's totals for the
 * range on the clipboard as plain text.
 */
export function TotalsTree({ totals, range, now }: TotalsTreeProps) {
  // Roots start open, so the first level of detail is always visible.
  const [toggled, setToggled] = useState<ReadonlySet<ContextId>>(new Set());
  const max = Math.max(1, ...totals.roots.map((r) => r.total));
  const isOpen = (node: TotalsNode) => (node.context.depth === 0) !== toggled.has(node.context.id);
  const toggle = (id: ContextId) =>
    setToggled((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const rows: TotalsNode[] = [];
  const walk = (nodes: TotalsNode[]) => {
    for (const node of nodes) {
      rows.push(node);
      if (isOpen(node)) walk(node.children);
    }
  };
  walk(totals.roots);

  if (rows.length === 0) return <Text style={styles.empty}>Nothing tracked in this range.</Text>;

  return (
    <View>
      {rows.map((node) => (
        <TotalsRow
          key={node.context.id}
          node={node}
          max={max}
          open={isOpen(node)}
          onToggle={() => {
            Haptics.selectionAsync();
            toggle(node.context.id);
          }}
          range={range}
          now={now}
        />
      ))}
    </View>
  );
}

function TotalsRow({
  node,
  max,
  open,
  onToggle,
  range,
  now,
}: {
  node: TotalsNode;
  max: number;
  open: boolean;
  onToggle: () => void;
  range: { start: number; end: number };
  now: number;
}) {
  const { context, total, children } = node;
  const color = neon[context.hue];
  const expandable = children.length > 0;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const { entries, tree } = useStint.getState();
    await Clipboard.setStringAsync(totalsText(entries, tree, context.id, range, now));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
  };

  // The row and its copy button are siblings, so VoiceOver reaches both.
  return (
    <View style={styles.row}>
      <Pressable
        onPress={expandable ? onToggle : undefined}
        accessibilityRole={expandable ? 'button' : 'text'}
        accessibilityLabel={`${context.name} ${formatDuration(total)}${expandable ? (open ? ', expanded' : ', collapsed') : ''}`}
        style={styles.main}>
        <Guides depth={context.depth} />
        <View style={styles.chevron}>
          {expandable && <SymbolView name={open ? 'chevron.down' : 'chevron.right'} size={10} tintColor={sky.dim} weight="bold" />}
        </View>
        <View style={styles.body}>
          <View style={styles.line}>
            <Text style={[styles.name, context.hidden && { color: sky.dim }]} numberOfLines={1}>
              {context.glyph ? `${context.glyph}  ` : ''}
              {context.name}
              {context.archivedAt !== null ? <Text style={styles.archived}>  archived</Text> : null}
            </Text>
            <Text style={styles.total}>{formatDuration(total)}</Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                { width: `${Math.max(1.5, (total / max) * 100)}%`, backgroundColor: color, shadowColor: color, opacity: context.depth ? 0.8 : 1 },
              ]}
            />
          </View>
        </View>
      </Pressable>
      <IconButton
        name={copied ? 'checkmark' : 'doc.on.doc'}
        size={14}
        color={copied ? sky.accent : alpha(sky.dim, 0.8)}
        accessibilityLabel={`Copy ${context.name} totals`}
        onPress={copy}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingLeft: 10 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  chevron: { width: 18, alignItems: 'center' },
  body: { flex: 1, paddingVertical: 8, paddingLeft: 4 },
  line: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  name: { flex: 1, fontFamily: font.textMedium, fontSize: 15, color: sky.text, letterSpacing: -0.2 },
  archived: { fontFamily: font.mono, fontSize: 9.5, color: sky.faint, letterSpacing: 1 },
  total: { fontFamily: font.mono, fontSize: 14, color: sky.text, fontVariant: ['tabular-nums'] },
  track: { marginTop: 7, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)' },
  bar: {
    height: 4,
    borderRadius: 2,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  empty: { textAlign: 'center', padding: 24, fontFamily: font.text, fontSize: 14, color: sky.dim },
});
