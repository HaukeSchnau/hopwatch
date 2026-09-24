// Haptics and tiny sounds. Sounds are quiet, mix with other audio and follow the
// ringer switch; they can be turned off in settings.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';

export const buzz = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  squish: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft),
  thud: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  tick: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

const sources = {
  pop: require('./assets/pop.wav') as number,
  boop: require('./assets/boop.wav') as number,
  plink: require('./assets/plink.wav') as number,
};
export type SoundName = keyof typeof sources;

// A UI preference, not tracking data, so it lives in its own small file.
const prefsFile = new File(Paths.document, 'jelly-prefs.json');

function readPrefs(): { sounds: boolean } {
  try {
    if (prefsFile.exists) {
      const parsed: unknown = JSON.parse(prefsFile.textSync());
      if (parsed && typeof parsed === 'object' && 'sounds' in parsed && typeof parsed.sounds === 'boolean') {
        return { sounds: parsed.sounds };
      }
    }
  } catch {
    // Unreadable prefs fall back to defaults.
  }
  return { sounds: true };
}

export const usePrefs = create<{ sounds: boolean }>(() => readPrefs());

export function setSounds(sounds: boolean) {
  usePrefs.setState({ sounds });
  try {
    if (!prefsFile.exists) prefsFile.create();
    prefsFile.write(JSON.stringify({ sounds }));
  } catch {
    // Not worth bothering the user about.
  }
}

let players: Partial<Record<SoundName, AudioPlayer>> | null = null;

function ensurePlayers() {
  if (players) return players;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  players = {};
  for (const name of Object.keys(sources) as SoundName[]) {
    const player = createAudioPlayer(sources[name]);
    player.volume = 0.45;
    players[name] = player;
  }
  return players;
}

/** Plays one of the candy sounds from the start, if sounds are on. */
export function play(name: SoundName) {
  if (!usePrefs.getState().sounds) return;
  try {
    const player = ensurePlayers()[name];
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {
    // Audio is decoration; never let it break a switch.
  }
}
