// Android surfaces outside the app: the running entry's ongoing notification and the
// launcher's shortcuts (Kotlin in android/). src/widgets/running-notification.ts and
// src/widgets/shortcuts.ts drive them from the store.

import { requireOptionalNativeModule } from 'expo';

/** A jelly drawn as an icon. Colors are hex strings like "#FF6FB5". */
export interface Icon {
  /** The emoji or initial. Null draws a stop square. */
  mark: string | null;
  /** The candy gradient from top to bottom. `fill` is also the notification's accent. */
  light: string;
  fill: string;
  deep: string;
  /** The mark's color on the candy. */
  on: string;
}

/** A button that opens a hopwatch:// link in the app. */
export interface LinkAction {
  label: string;
  url: string;
}

export interface RunningNotification {
  /** The jelly with its parents, "Clients › Acme". */
  title: string;
  /** "Since 09:12". */
  text: string;
  /** The entry's start in epoch ms. The system chronometer counts up from it. */
  since: number;
  icon: Icon;
  actions: LinkAction[];
  /** The notification channel's name and description in the app's language. */
  channelName: string;
  channelDescription: string;
}

export interface Shortcut {
  /** Stable across updates, so a shortcut pinned to the home screen keeps up. */
  id: string;
  shortLabel: string;
  longLabel: string;
  url: string;
  icon: Icon;
}

interface Native {
  /** Posts or updates the notification; false when the app may not post notifications. */
  showRunning(notification: RunningNotification): Promise<boolean>;
  hideRunning(): Promise<void>;
  /** Replaces the dynamic shortcuts; launchers list them in this order. */
  setShortcuts(shortcuts: Shortcut[]): Promise<void>;
  /**
   * Clears the link the app was opened with, once it has run. Buttons and shortcuts start the
   * app fresh with their link, and a later reload (an OTA update applies one) would otherwise
   * get it from Linking.getInitialURL and run it again.
   */
  forgetLaunchLink(): void;
}

/** Null on iOS, and in Android builds from before this module. */
export const systemSurfaces = requireOptionalNativeModule<Native>('SystemSurfaces');
