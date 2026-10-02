import { useFonts } from 'expo-font';

import { nunito } from '@/jelly/theme';

/**
 * Loads Nunito, Android's stand-in for SF Pro Rounded (see `rounded` in src/jelly/theme.ts),
 * one family per weight. True once loaded, or once loading failed: then Roboto stands in.
 */
export function useFontsReady(): boolean {
  const [loaded, error] = useFonts({
    [nunito['500']]: require('../../assets/fonts/Nunito-Medium.ttf'),
    [nunito['600']]: require('../../assets/fonts/Nunito-SemiBold.ttf'),
    [nunito['700']]: require('../../assets/fonts/Nunito-Bold.ttf'),
    [nunito['800']]: require('../../assets/fonts/Nunito-ExtraBold.ttf'),
  });
  return loaded || error !== null;
}
