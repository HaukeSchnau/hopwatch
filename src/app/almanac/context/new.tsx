import { useLocalSearchParams } from 'expo-router';

import type { ContextId } from '@/core';
import { NewContext } from '@/directions/almanac/ContextEditor';

/** A new context; `?parent=<id>` files it under that parent, `?pin=1` pins it. */
export default function NewContextRoute() {
  const { parent, pin } = useLocalSearchParams<{ parent?: string; pin?: string }>();
  return <NewContext parentId={(parent as ContextId | undefined) ?? null} pinned={pin === '1'} />;
}
