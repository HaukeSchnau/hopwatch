// Development-only character gallery (see character/Gallery.tsx). Empty in release builds.
import { Gallery } from '@/directions/jelly/character/Gallery';

export default function Looks() {
  return __DEV__ ? <Gallery /> : null;
}
