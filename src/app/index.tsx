import { Redirect } from 'expo-router';

import { useStint } from '@/core';

/** Opens the active direction's home, or the Lab when none is picked yet. */
export default function Index() {
  const direction = useStint((s) => s.direction);
  return <Redirect href={direction ? `/${direction}` : '/lab'} />;
}
