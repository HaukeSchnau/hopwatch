// Haptics and key-click sounds. Every key press goes through here, so the whole device
// clicks the same way. Sounds follow the silent switch and mix with other audio.

import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';

const sources = {
  down: require('./assets/key-down.wav'),
  up: require('./assets/key-up.wav'),
  detent: require('./assets/detent.wav'),
};
type Sound = keyof typeof sources;

interface Prefs {
  sound: boolean;
}

// Deck's own preferences live in a small file next to the database, not in it.
const prefsFile = new File(Paths.document, 'deck-prefs.json');

function loadPrefs(): Prefs {
  try {
    if (prefsFile.exists) {
      const parsed: unknown = JSON.parse(prefsFile.textSync());
      if (parsed && typeof parsed === 'object' && 'sound' in parsed && typeof parsed.sound === 'boolean') {
        return { sound: parsed.sound };
      }
    }
  } catch {
    // A broken prefs file just means defaults.
  }
  return { sound: true };
}

export const useDeckPrefs = create<Prefs>(loadPrefs);

export function setSound(sound: boolean) {
  useDeckPrefs.setState({ sound });
  try {
    if (!prefsFile.exists) prefsFile.create();
    prefsFile.write(JSON.stringify({ sound }));
  } catch (error) {
    console.warn('deck prefs not saved', error);
  }
}

let players: Record<Sound, AudioPlayer> | null = null;

/** Creates the players once; call from the layout. Sounds stay silent in silent mode. */
export function prepareSounds() {
  if (players) return;
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  players = {
    down: createAudioPlayer(sources.down),
    up: createAudioPlayer(sources.up),
    detent: createAudioPlayer(sources.detent),
  };
  players.down.volume = 0.7;
  players.up.volume = 0.45;
  players.detent.volume = 0.5;
}

function play(sound: Sound) {
  if (!players || !useDeckPrefs.getState().sound) return;
  const player = players[sound];
  player.seekTo(0).catch(() => {});
  player.play();
}

/** A key reaching the bottom of its travel. */
export function keyDown(heavy = false) {
  Haptics.impactAsync(heavy ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Rigid);
  play('down');
}

/** A key springing back up. */
export function keyUp() {
  play('up');
}

/** One detent on the knob, or one snap step while dragging. */
export function detent() {
  Haptics.selectionAsync();
  play('detent');
}

/** The knob hitting its end stop. */
export function endStop() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function success() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function warning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
