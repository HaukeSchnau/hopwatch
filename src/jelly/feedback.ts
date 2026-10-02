// Haptics and tiny sounds. Sounds are quiet, mix with other audio and follow the
// ringer switch; they can be turned off in settings (the `jelly.sounds` preference).

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import { actions, type Json, usePref, useHopwatch } from '@/core';

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

const SOUNDS = 'jelly.sounds';
const parseSounds = (value: Json) => (typeof value === 'boolean' ? value : undefined);

/** Whether the squishy sounds are on. */
export const useSounds = () => usePref(SOUNDS, true, parseSounds);

export const setSounds = (on: boolean) => actions.setPref(SOUNDS, on);

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
  const stored = useHopwatch.getState().prefs[SOUNDS];
  if (stored !== undefined && parseSounds(stored) === false) return;
  try {
    const player = ensurePlayers()[name];
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {
    // Audio is decoration; never let it break a switch.
  }
}
