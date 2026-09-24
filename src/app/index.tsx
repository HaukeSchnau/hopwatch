import { type Href, Redirect } from 'expo-router';

import { useStint } from '@/core';
import { devLaunchRoute } from '@/shell/dev-route';

/** Opens the active direction's home, or the Lab when none is picked yet. */
export default function Index() {
  const direction = useStint((s) => s.direction);
  // Dev launch routes are arbitrary strings from simctl, so they can't be typed routes.
  const devRoute = devLaunchRoute() as Href | null;
  return <Redirect href={devRoute ?? (direction ? `/${direction}` : '/lab')} />;
}
