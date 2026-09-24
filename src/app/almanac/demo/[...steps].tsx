import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { runDemo } from '@/directions/almanac/demo';
import { paper } from '@/directions/almanac/theme';

/** Development only: `/almanac/demo/<step>/<step>…` sets up state, then opens a page. */
export default function DemoRoute() {
  const { steps } = useLocalSearchParams<{ steps: string[] }>();
  useEffect(() => {
    if (!__DEV__) return router.replace('/almanac');
    const target = runDemo(Array.isArray(steps) ? steps : [steps]);
    router.replace('/almanac');
    // Not cancelled on unmount: replacing this route unmounts it before the push.
    if (target !== '/almanac') setTimeout(() => router.push(target), 400);
  }, [steps]);
  return <View style={{ flex: 1, backgroundColor: paper.sheet }} />;
}
