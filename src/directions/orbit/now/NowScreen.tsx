import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { actions, type ContextId, loadSampleData, useContextById, useIntent, usePinned, useRunning, useTree } from '@/core';

import { useTabBarClearance } from '../TabBar';
import { Welcome } from '../Welcome';
import { BackPill } from './BackPill';
import { NowHero } from './NowHero';
import { OrbGrid } from './OrbGrid';
import { Recents } from './Recents';
import { DEFAULT_BACK, type Scrub } from './scrub';
import { ScrubPanel } from './ScrubPanel';

/**
 * The home screen and switcher. Shows onboarding until the first context exists.
 * For testing on the simulator: `?welcome=1` previews onboarding, `?scrub=start|stop`
 * opens backdating, and in development `?seed=sample` fills an empty database.
 */
export function NowScreen() {
  const empty = useTree().ordered.length === 0;
  const params = useLocalSearchParams<{ welcome?: string; scrub?: string; seed?: string }>();
  const seed = __DEV__ && empty && params.seed === 'sample';
  useEffect(() => {
    if (seed) loadSampleData();
  }, [seed]);
  if (empty || params.welcome) return <Welcome />;
  return <Switcher initialScrub={params.scrub} />;
}

function Switcher({ initialScrub }: { initialScrub?: string }) {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const running = useRunning();
  const pinned = usePinned();
  const intent = useIntent();
  const [scrub, setScrub] = useState<Scrub | null>(null);
  const scrubContext = useContextById(scrub?.kind === 'start' ? scrub.contextId : null);
  // A stop scrub ends by itself when the entry stops elsewhere, e.g. from a deep link.
  const active = scrub?.kind === 'stop' && !running ? null : scrub;

  const beginStart = (contextId: ContextId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScrub({ kind: 'start', contextId, at: Date.now() - DEFAULT_BACK });
  };
  const beginStop = () => {
    if (!running) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScrub({ kind: 'stop', at: Math.max(running.entry.startUtc, Date.now() - DEFAULT_BACK) });
  };

  // A tapped nudge asks for the backdated stop.
  useEffect(() => {
    if (intent?.kind !== 'stop-sheet') return;
    actions.consumeIntent();
    if (running) setScrub({ kind: 'stop', at: Math.max(running.entry.startUtc, Date.now() - DEFAULT_BACK) });
  }, [intent, running]);

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !initialScrub) return;
    opened.current = true;
    const first = pinned.tiles[0];
    if (initialScrub === 'stop' && running) {
      setScrub({ kind: 'stop', at: Math.max(running.entry.startUtc, Date.now() - DEFAULT_BACK) });
    } else if (initialScrub === 'start' && first) {
      setScrub({ kind: 'start', contextId: first.id, at: Date.now() - DEFAULT_BACK });
    }
  }, [initialScrub, running, pinned]);

  const tap = (id: ContextId) => {
    if (active?.kind === 'start') {
      setScrub({ ...active, contextId: id });
      return;
    }
    if (active) return;
    if (id === running?.context.id) {
      // Already running: nothing to switch.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actions.start(id);
  };

  const confirm = () => {
    if (!active) return;
    if (active.kind === 'start') actions.start(active.contextId, { at: active.at });
    else actions.stop({ at: active.at });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setScrub(null);
  };

  const stop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    actions.stop();
  };

  return (
    <ScrollView
      scrollEnabled={!active}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: clearance }}>
      <NowHero
        scrub={active}
        onScrubAt={(at) => setScrub((s) => s && { ...s, at })}
        onStop={stop}
        onStopLongPress={beginStop}
      />
      <View style={{ marginTop: 4, marginBottom: 16 }}>
        {active ? (
          <ScrubPanel
            scrub={active}
            context={scrubContext}
            runningSince={running?.entry.startUtc ?? null}
            onChange={(at) => setScrub((s) => s && { ...s, at })}
            onCancel={() => setScrub(null)}
            onConfirm={confirm}
          />
        ) : (
          <BackPill onLongPress={beginStart} />
        )}
      </View>
      <Animated.View layout={LinearTransition.springify().damping(20)}>
        <OrbGrid
          runningId={running?.context.id ?? null}
          selectedId={active?.kind === 'start' ? active.contextId : null}
          onPress={tap}
          onLongPress={beginStart}
        />
        <Recents selectedId={active?.kind === 'start' ? active.contextId : null} onPress={tap} onLongPress={beginStart} />
      </Animated.View>
    </ScrollView>
  );
}
