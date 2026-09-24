import { type ComponentProps, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, MINUTE, useIntent, useNow, usePinned, useRunning, useSwitchTarget, useTree } from '@/core';

import { Body } from '../Body';
import { useDevParam } from '../devParams';
import { success } from '../feedback';
import { DeviceHeader } from '../Header';
import { KnobPanel } from '../knob/KnobPanel';
import { Onboarding } from '../onboarding/Onboarding';
import { Section } from '../Section';
import { UndoStrip } from '../UndoStrip';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { maxRewindMinutes, type Program } from './program';
import { Recents } from './Recents';
import { Transport } from './Transport';

const TRANSPORT_HEIGHT = 68;
const BOTTOM_PAD = 12;

/**
 * SWITCH, the home mode: the LCD with the running timer, the pinned keypad, recents and
 * the transport keys. Holding a key brings out the rewind knob over the keypad.
 */
export function SwitchScreen() {
  const insets = useSafeAreaInsets();
  const tree = useTree();
  const running = useRunning();
  const intent = useIntent();
  const [program, setProgram] = useState<Program | null>(null);
  const [minutes, setMinutes] = useState(0);
  const [exact, setExact] = useState<number | null>(null);

  const open = (next: Program) => {
    setMinutes(0);
    setExact(null);
    setProgram(next);
  };

  // A tapped nudge notification lands here: bring out the knob in stop mode.
  useEffect(() => {
    if (intent?.kind !== 'stop-sheet') return;
    actions.consumeIntent();
    if (running) open({ kind: 'stop' });
  }, [intent, running]);

  // Development: `?knob=stop:15`, `?knob=back`, `?knob=start:3:20` open the knob preset.
  const knobParam = useDevParam('knob');
  const { slots } = usePinned();
  const target = useSwitchTarget();
  const knobApplied = useRef(false);
  useEffect(() => {
    if (!knobParam || knobApplied.current || slots.length === 0) return;
    const [kind, a, b] = knobParam.split(':');
    let next: Program | null = null;
    let preset = Number(a ?? 0);
    if (kind === 'stop' && running) next = { kind: 'stop' };
    else if (kind === 'back' && target) next = { kind: 'back', contextId: target.context.id };
    else if (kind === 'start') {
      const context = slots[Number(a) - 1];
      if (context) next = { kind: 'start', contextId: context.id };
      preset = Number(b ?? 0);
    }
    if (!next) return;
    knobApplied.current = true;
    setProgram(next);
    setMinutes(preset || 0);
  }, [knobParam, slots, running, target]);

  // The running entry may end elsewhere (deep link, undo) while stopping.
  useEffect(() => {
    if (program?.kind === 'stop' && !running) setProgram(null);
  }, [program, running]);

  if (tree.ordered.length === 0) return <Onboarding />;

  const enter = () => {
    if (!program) return;
    const at = exact ?? Date.now() - minutes * MINUTE;
    const opts = exact === null && minutes === 0 ? {} : { at };
    if (program.kind === 'stop') actions.stop(opts);
    else if (program.kind === 'back') actions.back(opts);
    else actions.start(program.contextId, opts);
    success();
    setProgram(null);
  };

  return (
    <Body>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <DeviceHeader />
        <View style={styles.lcd}>
          <Display program={program} minutes={minutes} exact={exact} />
        </View>
        <View style={styles.controls}>
          <Section label="KEYS" hint="HOLD A KEY TO REWIND" style={styles.section} />
          <ScrollView style={styles.keypad} contentContainerStyle={styles.keypadContent} showsVerticalScrollIndicator={false}>
            <Keypad onRewind={(contextId) => open({ kind: 'start', contextId })} />
          </ScrollView>
          <Recents onRewind={(contextId) => open({ kind: 'start', contextId })} />
          <Section label="TRANSPORT" hint="HOLD TO REWIND" style={[styles.section, { marginTop: 6 }]} />
          <View style={{ marginTop: 8, marginBottom: BOTTOM_PAD }}>
            <Transport onRewind={open} />
          </View>
          {program ? (
            <RewindPanel
              program={program}
              minutes={minutes}
              exact={exact}
              onMinutes={setMinutes}
              onExact={setExact}
              onCancel={() => setProgram(null)}
              onEnter={enter}
            />
          ) : null}
        </View>
        {program ? null : <UndoStrip bottom={TRANSPORT_HEIGHT + BOTTOM_PAD + 10} />}
      </View>
    </Body>
  );
}

type RewindPanelProps = Omit<ComponentProps<typeof KnobPanel>, 'max' | 'earliest'> & { program: Program };

/** The knob panel with its limits, which depend on the clock; mounted only while rewinding. */
function RewindPanel({ program, ...props }: RewindPanelProps) {
  const running = useRunning();
  const now = useNow(30_000);
  const earliest = program.kind === 'stop' && running ? running.entry.startUtc : now - 24 * 60 * MINUTE;
  return <KnobPanel {...props} max={maxRewindMinutes(program, running, now)} earliest={earliest} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  lcd: { paddingHorizontal: 12, marginTop: 2 },
  controls: { flex: 1, paddingHorizontal: 16, marginTop: 12 },
  section: { marginBottom: 2 },
  keypad: { flex: 1, marginHorizontal: -16 },
  keypadContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
});
