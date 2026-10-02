// Development-only character gallery (see character/Gallery.tsx). Release builds send
// stint://looks to Now instead of an empty screen without a way back.
import { Redirect } from 'expo-router';

import { Gallery } from '@/jelly/character/Gallery';

export default function Looks() {
  return __DEV__ ? <Gallery /> : <Redirect href="/" />;
}
