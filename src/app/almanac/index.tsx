import { useLocalSearchParams } from 'expo-router';

import { useTree } from '@/core';
import { FirstEdition } from '@/directions/almanac/FirstEdition';
import { FrontPage } from '@/directions/almanac/FrontPage';

/** The front page, or the first edition while there are no contexts yet. */
export default function AlmanacHome() {
  const tree = useTree();
  // `?preview=first` shows the first edition over existing data, for design review.
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  if (tree.ordered.length === 0 || (__DEV__ && preview === 'first')) return <FirstEdition />;
  return <FrontPage />;
}
