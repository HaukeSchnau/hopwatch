import { router, Tabs } from 'expo-router';
import { useEffect } from 'react';

import { useIntent, useTree } from '@/core';
import { useDevData } from '@/directions/deck/devParams';
import { ModeBar } from '@/directions/deck/ModeBar';
import { body } from '@/directions/deck/theme';

/** The device's modes, switched with the function keys at the bottom. */
export default function ModesLayout() {
  const tree = useTree();
  const intent = useIntent();
  const empty = tree.ordered.length === 0;
  useDevData();

  // A tapped nudge asks for the stop knob, which lives in SWITCH.
  useEffect(() => {
    if (intent?.kind === 'stop-sheet') router.navigate('/deck');
  }, [intent]);

  return (
    <Tabs
      tabBar={(props) => (empty ? null : <ModeBar {...props} />)}
      screenOptions={{ headerShown: false, animation: 'none', sceneStyle: { backgroundColor: body.base } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="tree" />
      <Tabs.Screen name="sys" />
    </Tabs>
  );
}
