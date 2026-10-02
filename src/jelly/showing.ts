// Whether a screen can be seen, so idle loops (a breathing jelly, a pulsing glow, sloshing
// jars) only draw while someone can see them: the screen's tab is selected and the app isn't
// in the background. A sheet over a tab doesn't hide it, since the tab still shows around it.

import { createContext, use } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

const useShown = create<{ tab: string; foreground: boolean }>(() => ({
  tab: 'index',
  foreground: AppState.currentState !== 'background',
}));

AppState.addEventListener('change', (state) => useShown.setState({ foreground: state !== 'background' }));

/** The selected tab's route name. JellyTabs sets it with `showTab` as tabs come into view. */
export const useShownTab = () => useShown((s) => s.tab);
export const showTab = (tab: string) => useShown.setState({ tab });

/** The route name of the tab a screen lives in, provided by the tab's screen. Sheets have none. */
export const ScreenTab = createContext<string | null>(null);

/** Whether the screen this renders in can be seen right now. */
export function useShowing(): boolean {
  const tab = use(ScreenTab);
  return useShown((s) => s.foreground && (tab === null || s.tab === tab));
}
