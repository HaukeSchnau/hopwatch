// The week as a card to share: the total, the week's jellies as characters sized by their
// time, the top three, the week's summary when the model wrote one, and the Hopwatch
// mark. The sheet shows the card as it'll look and shares a snapshot of it: 360 × 450 pt,
// which the phone's 3× screen turns into a 1080 × 1350 picture.

import { makeImageFromView } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { dayKey, formatDuration, formatWeekRange, startOfWeek, type TotalsNode, useNow, useWeekReport } from '@/core';
import { weekText } from '@/i18n/week';

import { Character } from '../Character';
import { buzz } from '../feedback';
import { rounded, tabular, text, useTheme } from '../theme';
import { JellyButton } from '../ui';
import { pack } from './pack';
import { useWeekSummary } from './summary';

const CARD = { width: 360, height: 450 };
const s = weekText.card;

export function WeekCardSheet() {
  const t = useTheme();
  const params = useLocalSearchParams<{ week?: string }>();
  const now = useNow(60_000);
  const week = startOfWeek(params.week ? Number(params.week) : now);
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    buzz.tap();
    setSharing(true);
    try {
      const image = await makeImageFromView(card);
      if (!image) return;
      const file = new File(Paths.cache, `hopwatch-week-${dayKey(week)}.png`);
      if (file.exists) file.delete();
      file.create();
      file.write(image.encodeToBytes());
      await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: s.share });
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={[text.title2, { color: t.c.ink }]}>{s.title}</Text>
      {/* Rounded on screen only: the snapshot is the square view inside, since some apps
          turn a picture's transparent corners black. */}
      <View style={[styles.frame, { borderColor: t.c.line }]}>
        <View ref={card} collapsable={false} style={[styles.card, { backgroundColor: t.c.bg }]}>
          <WeekCard week={week} />
        </View>
      </View>
      <JellyButton label={s.share} icon={{ ios: 'square.and.arrow.up', android: 'share' }} size="large" disabled={sharing} onPress={share} style={styles.button} />
    </View>
  );
}

function WeekCard({ week }: { week: number }) {
  const t = useTheme();
  const report = useWeekReport(week);
  const summary = useWeekSummary(week);
  const roots = report.totals.roots.filter((n) => n.total > 0).slice(0, 5);
  const top = roots.slice(0, 3);
  const area = { width: CARD.width - 48, height: 112 };
  const circles = pack(
    roots.map((n) => n.total),
    area.width,
    area.height,
  );
  const sentence = summary && summary !== 'writing' ? summary.text : null;

  return (
    <View style={styles.inner}>
      <Text style={[text.caption, styles.kicker, { color: t.c.muted }]}>{s.kicker(formatWeekRange(week))}</Text>
      <Text style={[styles.total, tabular, { color: t.c.ink }]}>{formatDuration(report.totals.total)}</Text>
      <Text style={[text.footnote, { color: t.c.muted }]}>{s.across(report.totals.roots.filter((n) => n.total > 0).length)}</Text>

      <View style={[styles.jellies, area]}>
        {roots.map((node, i) => (
          <View key={node.context.id} style={[styles.jelly, { left: circles[i].x - circles[i].r, top: circles[i].y - circles[i].r }]}>
            <Character context={node.context} size={Math.max(28, circles[i].r * 1.9)} mood={i === 0 ? 'awake' : 'asleep'} shadow={false} />
          </View>
        ))}
      </View>

      <View style={styles.rows}>
        {top.map((node) => (
          <Row key={node.context.id} node={node} total={report.totals.total} />
        ))}
      </View>

      {sentence ? (
        <Text style={[text.footnote, styles.summary, { color: t.c.ink }]} numberOfLines={2}>
          {sentence}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={[styles.mark, { color: t.c.pinkDeep }]}>Hopwatch</Text>
        <Text style={[text.caption, { color: t.c.muted }]}> · hopwatch.schnau.dev</Text>
      </View>
    </View>
  );
}

function Row({ node, total }: { node: TotalsNode; total: number }) {
  const t = useTheme();
  const c = t.candy[node.context.hue];
  return (
    <View style={styles.row}>
      <Text style={styles.glyph}>{node.context.glyph ?? ''}</Text>
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <Text style={[text.subhead, styles.name, { color: t.c.ink }]} numberOfLines={1}>
            {node.context.name}
          </Text>
          <Text style={[text.subhead, tabular, { color: t.c.ink }]}>{formatDuration(node.total)}</Text>
        </View>
        <View style={[styles.track, { backgroundColor: t.c.sunken }]}>
          <View style={[styles.bar, { width: `${Math.max(4, (node.total / total) * 100)}%`, backgroundColor: c.fill }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { padding: 20, paddingTop: 26, alignItems: 'center', gap: 16 },
  frame: { borderRadius: 28, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  card: { width: CARD.width, height: CARD.height },
  inner: { flex: 1, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center' },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700' },
  total: { ...rounded('800'), fontSize: 50, letterSpacing: -1 },
  jellies: { marginTop: 8 },
  jelly: { position: 'absolute' },
  rows: { alignSelf: 'stretch', gap: 6, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glyph: { fontSize: 20, width: 26, textAlign: 'center' },
  rowText: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  summary: { marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
  footer: { marginTop: 'auto', flexDirection: 'row', alignItems: 'baseline' },
  mark: { ...rounded('800'), fontSize: 16 },
  button: { width: CARD.width },
});
