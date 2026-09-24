import { router } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useEffect } from 'react';
import { View } from 'react-native';

import { actions, useIntent, useTree } from '@/core';
import { TabBar, tabs } from '@/directions/jelly/TabBar';
import { colors } from '@/directions/jelly/theme';
import { Toast } from '@/directions/jelly/Toast';
import { Welcome } from '@/directions/jelly/welcome/Welcome';

export default function JellyTabs() {
  const empty = useTree().ordered.length === 0;
  useStopSheetIntent();
  if (empty) return <Welcome />;
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.cream }}>
      <TabSlot />
      <TabBar />
      <Toast />
      <TabList style={{ display: 'none' }}>
        {tabs.map((t) => (
          <TabTrigger key={t.name} name={t.name} href={t.href} />
        ))}
      </TabList>
    </Tabs>
  );
}

/** A tapped nudge asks for the backdated-stop sheet. */
function useStopSheetIntent() {
  const intent = useIntent();
  useEffect(() => {
    if (intent?.kind !== 'stop-sheet') return;
    actions.consumeIntent();
    router.push('/jelly/stop');
  }, [intent]);
}
