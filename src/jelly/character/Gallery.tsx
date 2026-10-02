// Development-only gallery of the characters: every trait, sample contexts asleep and
// awake, several sizes, light and dark, and a check of the on-device model. Open it with
// `scripts/sim.sh view UDID "/looks?s=grid" OUT.png`; `s` picks one section.

import { availability, lastFailure } from '@modules/on-device-model';
import { useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type Hue, loadSampleData, useStint, useTree } from '@/core';
import { optionNames } from '@/i18n/character';

import { Character } from '../Character';
import { useFace, useLively, wake } from '../Gummy';
import type { LookSource } from './derive';
import { parseSuggestion, SUGGESTION_VERSION } from './ask';
import { suggestedKey } from './look';
import { LookEditor } from './LookEditor';
import { suggestForContext, useDressUp } from './suggest';
import { useTheme } from '../theme';
import { bodies, type Look, member, traitOptions } from './traits';

type Sample = LookSource & { hue: Hue; name: string };

// Stand-ins for the sample data, used until real contexts exist.
const samples: Sample[] = [
  { id: 's-job', name: 'Job', glyph: '💼', hue: 'blue' },
  { id: 's-deep', name: 'Deep work', glyph: '🎧', hue: 'blue' },
  { id: 's-meetings', name: 'Meetings', glyph: '🗣️', hue: 'indigo' },
  { id: 's-dog', name: 'Dog', glyph: '🐕', hue: 'amber' },
  { id: 's-lunch', name: 'Lunch', glyph: '🥪', hue: 'pink' },
  { id: 's-website', name: 'Website', glyph: '🌐', hue: 'orange' },
  { id: 's-podcast', name: 'Podcast', glyph: '🎙️', hue: 'lime' },
  { id: 's-cooking', name: 'Cooking', glyph: '🍳', hue: 'orange' },
  { id: 's-sport', name: 'Sport', glyph: '🏃', hue: 'red' },
];

const plain: Look = { body: 'blob', eyes: 'dot', mouth: 'smile', topper: 'none', neck: 'none', surface: 'plain', motion: 'bouncy' };
const hues: Hue[] = ['pink', 'blue', 'amber', 'teal', 'violet', 'orange', 'green', 'red', 'cyan', 'indigo', 'lime', 'gray'];

function Cell({ source, size, look, mood, label, dark }: { source: Sample; size: number; look?: Partial<Look>; mood: 'awake' | 'asleep'; label: string; dark?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.cell, { width: Math.max(size + 8, 96) }]}>
      <Character context={source} size={size} look={look} mood={mood} />
      <Text style={[styles.label, { color: dark ? '#FBF3FF' : theme.c.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children, dark }: { title: string; children: ReactNode; dark?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, dark && styles.dark]}>
      <Text style={[styles.title, { color: dark ? '#FBF3FF' : theme.c.ink }]}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

function TraitSection<K extends keyof Look>({ trait, base, mood, size = 84 }: { trait: K; base: Partial<Look>; mood: 'awake' | 'asleep'; size?: number }) {
  const options = traitOptions[trait];
  return (
    <Section title={`${trait} · ${mood}`}>
      {options.map((option, i) => (
        <Cell
          key={option}
          source={{ id: `g-${trait}-${option}`, name: '', glyph: null, hue: hues[i % hues.length] }}
          size={size}
          look={{ ...plain, ...base, [trait]: option }}
          mood={mood}
          label={optionNames[trait][option]}
        />
      ))}
    </Section>
  );
}

function LiveCell({ source, size }: { source: Sample; size: number }) {
  const theme = useTheme();
  const face = useFace('awake');
  useLively(face, true);
  useEffect(() => wake(face), [face]);
  return (
    <View style={[styles.cell, { width: size + 8 }]}>
      <Character context={source} size={size} face={face} />
      <Text style={[styles.label, { color: theme.c.ink }]}>{source.name}</Text>
    </View>
  );
}

/** Runs the background dress-up and lists what the model picked per context. */
function DressUp({ contexts }: { contexts: Sample[] }) {
  useDressUp();
  const prefs = useStint((state) => state.prefs);
  return (
    <Section title="Dress-up">
      {contexts.slice(0, 9).map((c) => {
        const stored = prefs[suggestedKey(c.id)];
        const picked = stored === undefined ? undefined : parseSuggestion(stored);
        const label = picked ? [picked.version < SUGGESTION_VERSION ? 'old' : (picked.topic ?? '–'), ...Object.values(picked.traits)].join(' ') : '…';
        return <Cell key={c.id} source={c} size={84} mood="asleep" label={`${c.name}: ${label}`} />;
      })}
      <Pressable
        onPress={() => {
          for (const c of contexts) actions.setPref(suggestedKey(c.id), null);
        }}
        style={styles.button}>
        <Text style={styles.buttonText}>Forget suggestions</Text>
      </Pressable>
    </Section>
  );
}

function ModelCheck() {
  const [state, setState] = useState('checking…');
  const [answer, setAnswer] = useState('');
  useEffect(() => {
    let live = true;
    (async () => {
      const status = await availability();
      if (!live) return;
      setState(status);
      const started = Date.now();
      const results = [];
      for (const input of [
        { name: 'Piano practice', ancestors: [], siblings: [], wantEmoji: true, wantHue: true },
        { name: 'Standup', ancestors: ['Job'], siblings: [{ name: 'Meetings', emoji: '🗣️' }], wantEmoji: true },
        { name: 'Cooking', ancestors: ['Household'], siblings: [{ name: 'Dog', emoji: '🐕' }], wantEmoji: false },
      ]) {
        const suggestion = await suggestForContext(input);
        results.push(`${input.name}: ${suggestion ? JSON.stringify(suggestion) : `failed, ${lastFailure() ?? 'no answer'}`}`);
      }
      if (live) setAnswer(`${results.join('\n')}\nin ${Date.now() - started} ms`);
    })();
    return () => {
      live = false;
    };
  }, []);
  return (
    <Section title="On-device model">
      <Text style={styles.mono}>availability: {state}</Text>
      <Text style={styles.mono}>generate: {answer || '…'}</Text>
    </Section>
  );
}

/** The gallery. Renders nothing outside development. */
export function Gallery() {
  const { s = 'all', m, b, g } = useLocalSearchParams<{ s?: string; m?: string; b?: string; g?: string }>();
  const body = member(bodies, b) ?? 'blob';
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const real = tree.ordered.filter((c) => !c.hidden);
  // `g=1` paints everyone gray, to check they're told apart without color.
  const contexts: Sample[] = (real.length >= 9 ? real.slice(0, 18).map((c) => ({ id: c.id, name: c.name, glyph: c.glyph, hue: c.hue })) : samples).map((c) =>
    g ? { ...c, hue: 'gray' } : c,
  );
  const mood = m === 'awake' ? 'awake' : 'asleep';
  const show = (section: string) => s === 'all' || s.split(',').includes(section);
  if (!__DEV__) return null;

  return (
    <ScrollView style={{ backgroundColor: theme.c.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}>
      {show('grid') && (
        <Section title={`Contexts · ${mood}`}>
          {contexts.slice(0, 9).map((c) => (
            <Cell key={c.id} source={c} size={96} mood={mood} label={c.name} />
          ))}
        </Section>
      )}
      {show('more') && (
        <Section title={`More contexts · ${mood}`}>
          {contexts.slice(9, 18).map((c) => (
            <Cell key={c.id} source={c} size={96} mood={mood} label={c.name} />
          ))}
        </Section>
      )}
      {show('live') && (
        <Section title="Awake and idling">
          {contexts.slice(0, 9).map((c) => (
            <LiveCell key={c.id} source={c} size={96} />
          ))}
        </Section>
      )}
      {show('dark') && (
        <Section title={`Night candy · ${mood}`} dark>
          {contexts.slice(0, 9).map((c) => (
            <Cell key={c.id} source={c} size={96} mood={mood} label={c.name} dark />
          ))}
        </Section>
      )}
      {show('sizes') && (
        <Section title="Sizes">
          {[28, 36, 48, 64].map((size, i) => (
            <Cell key={size} source={contexts[i + 1]} size={size} mood={mood} label={`${size}`} />
          ))}
          {[124, 200].map((size, i) => (
            <Cell key={size} source={contexts[i + 3]} size={size} mood={mood} label={`${size}`} />
          ))}
        </Section>
      )}
      {show('bodies') && <TraitSection trait="body" base={{}} mood={mood} />}
      {show('eyes') && <TraitSection trait="eyes" base={{ body }} mood={mood} />}
      {show('mouths') && <TraitSection trait="mouth" base={{ body }} mood={mood} />}
      {show('toppers') && <TraitSection trait="topper" base={{ body }} mood={mood} size={72} />}
      {show('necks') && <TraitSection trait="neck" base={{ body }} mood={mood} />}
      {show('coats') && <TraitSection trait="surface" base={{ body }} mood={mood} />}
      {show('editor') && contexts[0] && real[0] && (
        <View style={styles.section}>
          <LookEditor context={real[0]} />
        </View>
      )}
      {show('model') && <ModelCheck />}
      {show('dress') && <DressUp contexts={contexts} />}
      <Pressable onPress={() => loadSampleData()} style={styles.button}>
        <Text style={styles.buttonText}>Load sample data</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 10, paddingVertical: 12 },
  dark: { backgroundColor: '#150F1D' },
  title: { fontFamily: 'ui-rounded', fontSize: 15, fontWeight: '800', marginLeft: 6, marginBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-end' },
  cell: { alignItems: 'center', marginVertical: 4 },
  label: { fontFamily: 'ui-rounded', fontSize: 13, fontWeight: '700', marginTop: -2 },
  mono: { fontFamily: 'ui-monospace', fontSize: 13, color: '#2B1B3D', width: '100%', marginBottom: 4 },
  button: { margin: 16, padding: 14, borderRadius: 20, backgroundColor: '#2B1B3D', alignItems: 'center' },
  buttonText: { color: 'white', fontFamily: 'ui-rounded', fontWeight: '700', fontSize: 16 },
});
