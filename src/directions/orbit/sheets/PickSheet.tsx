import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { actions, useRunning } from '@/core';

import { ContextPicker } from '../ContextPicker';
import { SheetHeader } from '../sheet';

/** Every context, one tap from home: tapping one switches to it. */
export function PickSheet() {
  const running = useRunning();
  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: 40 }}>
      <SheetHeader kicker="Switch to" title="All contexts" />
      <ContextPicker
        selectedId={running?.context.id ?? null}
        searchFrom={0}
        onPick={(context) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          actions.start(context.id);
          router.back();
        }}
      />
    </ScrollView>
  );
}
