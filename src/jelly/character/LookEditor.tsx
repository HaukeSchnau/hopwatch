// The "Look" section of the context editor: a big live preview, one strip of options per
// trait, "Surprise me" and "Automatic". Picks are stored as the context's custom look
// right away; traits left alone keep following the automatic look (see look.ts).

import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ResolvedContext } from '@/core';

import { Character } from '../Character';
import { buzz } from '../feedback';
import { useFace, useLively, wake } from '../Gummy';
import { text, useTheme } from '../theme';
import { JellyButton, Squishy } from '../ui';
import { surpriseLook } from './derive';
import { hop, perform } from './idle';
import { saveCustomLook, useAutoLook, useCustomLook } from './look';
import { type Look, motionBlurbs, optionNames, type Trait, traitKeys, traitNames, traitOptions, withTraits } from './traits';

export interface LookEditorProps {
  context: ResolvedContext;
  /** The big live preview; turn it off when the sheet already shows the jelly. */
  preview?: boolean;
}

const THUMB = 62;
const CELL = 78;

export function LookEditor({ context, preview = true }: LookEditorProps) {
  const theme = useTheme();
  const tint = theme.candy[context.hue];
  const auto = useAutoLook(context);
  const custom = useCustomLook(context.id);
  const look = withTraits(auto, custom);
  const [trait, setTrait] = useState<Trait>('topper');
  const face = useFace('awake');
  useLively(face, true);

  function pick<K extends Trait>(key: K, value: Look[K]) {
    const next: Partial<Look> = { ...custom };
    next[key] = value;
    saveCustomLook(context.id, next, auto);
    buzz.tap();
    wake(face);
  }

  return (
    <View style={styles.root}>
      {preview && (
        <View style={[styles.stage, { backgroundColor: tint.tint }]}>
          <Character context={context} size={188} face={face} sticker={false} />
        </View>
      )}
      <View style={styles.actions}>
        <JellyButton
          label="Surprise me"
          icon="dice.fill"
          size="small"
          hue={context.hue}
          style={styles.action}
          onPress={() => {
            saveCustomLook(context.id, surpriseLook(), auto);
            buzz.tap();
            wake(face);
            hop(face, [0.6, 1]);
          }}
        />
        <JellyButton
          label="Automatic"
          icon="wand.and.stars"
          size="small"
          palette={theme.plainCandy}
          disabled={!custom}
          style={styles.action}
          accessibilityHint="Goes back to the look that fits its name and emoji"
          onPress={() => {
            saveCustomLook(context.id, null, auto);
            buzz.tap();
            hop(face, [0.5]);
          }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {traitKeys.map((key) => {
          const on = key === trait;
          return (
            <Squishy
              key={key}
              onPress={() => setTrait(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.tab, { backgroundColor: on ? tint.fill : theme.c.sunken }]}>
              <Text style={[text.subhead, { color: on ? tint.on : theme.c.ink }]}>{traitNames[key]}</Text>
            </Squishy>
          );
        })}
      </ScrollView>

      {trait === 'motion' ? (
        <MotionChips
          look={look}
          auto={auto}
          onPick={(motion) => {
            pick('motion', motion);
            perform(face, motion);
          }}
        />
      ) : (
        <OptionStrip
          key={trait}
          trait={trait}
          context={context}
          look={look}
          auto={auto}
          onPick={(value) => {
            pick(trait, value);
            hop(face, [0.5]);
          }}
        />
      )}
    </View>
  );
}

interface StripProps<K extends Trait> {
  trait: K;
  context: ResolvedContext;
  look: Look;
  auto: Look;
  onPick: (value: Look[K]) => void;
}

/** One trait's options as little jellies wearing them, scrolled so the current one shows. */
function OptionStrip<K extends Trait>({ trait, context, look, auto, onPick }: StripProps<K>) {
  const theme = useTheme();
  const tint = theme.candy[context.hue];
  const options = traitOptions[trait];
  // Opens scrolled so the current option shows; the strip remounts per trait.
  const start = Math.max(0, options.indexOf(look[trait]) * CELL - CELL * 1.5);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: start, y: 0 }} contentContainerStyle={styles.strip}>
      {options.map((option) => {
        const on = option === look[trait];
        const variant: Partial<Look> = { ...look };
        variant[trait] = option;
        return (
          <Squishy
            key={option}
            onPress={() => onPick(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={optionNames[trait][option]}
            style={styles.cell}>
            <View style={[styles.thumb, { backgroundColor: on ? tint.tint : theme.c.sunken, borderColor: on ? tint.fill : 'transparent' }]}>
              <Character context={context} size={THUMB} look={variant} mood="awake" sticker={false} shadow={false} />
            </View>
            <Text style={[styles.label, { color: on ? tint.ink : theme.c.muted }]} numberOfLines={1}>
              {optionNames[trait][option]}
              {option === auto[trait] ? ' ✦' : ''}
            </Text>
          </Squishy>
        );
      })}
    </ScrollView>
  );
}

/** Personalities can't be seen in a still, so they are chips that play on the preview. */
function MotionChips({ look, auto, onPick }: { look: Look; auto: Look; onPick: (value: Look['motion']) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.chips}>
      {traitOptions.motion.map((motion) => {
        const on = motion === look.motion;
        return (
          <Squishy
            key={motion}
            onPress={() => onPick(motion)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.chip, { backgroundColor: on ? theme.c.ink : theme.c.sunken }]}>
            <Text style={[text.subhead, { color: on ? theme.c.bg : theme.c.ink }]}>
              {optionNames.motion[motion]}
              {motion === auto.motion ? ' ✦' : ''}
            </Text>
            <Text style={[text.caption, { color: on ? theme.c.faint : theme.c.muted, fontWeight: '600' }]}>{motionBlurbs[motion]}</Text>
          </Squishy>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  stage: { height: 184, borderRadius: 30, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1 },
  tabs: { gap: 6, paddingRight: 8 },
  tab: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center' },
  strip: { gap: 4, paddingRight: 8 },
  cell: { width: CELL, alignItems: 'center' },
  thumb: { width: CELL - 6, height: CELL - 6, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'ui-rounded', fontSize: 12, fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, minWidth: '30%' },
});
