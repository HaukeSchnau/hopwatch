import { useLocalSearchParams } from 'expo-router';

import type { EntryId } from '@/core';
import { EntryPage } from '@/directions/almanac/EntryPage';

/** One entry: context, start, end, note, strike. */
export default function EntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntryPage id={id as EntryId} />;
}
