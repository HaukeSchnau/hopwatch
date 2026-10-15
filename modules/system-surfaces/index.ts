// Surfaces outside the app. On both platforms: the snapshot the app writes for widgets,
// controls and Siri, and the queue of taps it replays (src/core/remote.ts,
// src/widgets/surfaces.ts). On Android also the running entry's ongoing notification and
// the launcher's shortcuts (src/widgets/running-notification.ts, shortcuts.ts).
// Swift in ios/, Kotlin in android/.

import { NativeModule, requireOptionalNativeModule } from 'expo';

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

/** A button that queues a tap for the app to replay (a RemoteCommand without seq and at, as JSON). */
export interface TapAction {
  label: string;
  command: string;
}

export interface RunningNotification {
  /** The jelly with its parents, "Clients › Acme". */
  title: string;
  /** "Since 09:12". */
  text: string;
  /** The entry's start in epoch ms. The system chronometer counts up from it. */
  since: number;
  icon: Icon;
  actions: TapAction[];
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

type Events = {
  /** A tap queued a command while the app runs: replay it now. */
  onCommands: () => void;
};

declare class Native extends NativeModule<Events> {
  /** Writes the snapshot (JSON) where surfaces read it, and lets them catch up. */
  writeSnapshot(json: string): void;
  /** Queued taps (JSON each), oldest first. */
  readCommands(): string[];
  /** Removes replayed taps by their `seq`. */
  removeCommands(seqs: number[]): void;

  // Android only from here.

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

/** Null in builds from before this module (iOS before 1.2.0, Android before 1.1.0). */
export const systemSurfaces = requireOptionalNativeModule<Native>('SystemSurfaces');
