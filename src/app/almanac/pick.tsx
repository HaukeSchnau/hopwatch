import { useLocalSearchParams } from 'expo-router';

import type { EntryId } from '@/core';
import { EntryPick, GapPick } from '@/directions/almanac/Pick';

/**
 * The picker slip. `?for=gap&from=<ms>&to=<ms>&at=<ms>` fills a gap;
 * `?for=entry&id=<entryId>` refiles an entry.
 */
export default function PickRoute() {
  const params = useLocalSearchParams<{ for?: string; from?: string; to?: string; at?: string; id?: string }>();
  if (params.for === 'entry' && params.id) return <EntryPick entryId={params.id as EntryId} />;
  const from = Number(params.from);
  const to = Number(params.to);
  const at = Number(params.at ?? params.from);
  return <GapPick from={from} to={to} at={Number.isFinite(at) ? at : from} />;
}
