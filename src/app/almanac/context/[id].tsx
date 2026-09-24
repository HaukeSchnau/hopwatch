import { useLocalSearchParams } from 'expo-router';

import type { ContextId } from '@/core';
import { EditContext } from '@/directions/almanac/ContextEditor';

/** Edit one context of the Index. */
export default function EditContextRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditContext id={id as ContextId} />;
}
