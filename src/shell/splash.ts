import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

/** Hides the native splash screen once `ready` turns true, e.g. when fonts are loaded. */
export function useHideSplash(ready = true) {
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
}
