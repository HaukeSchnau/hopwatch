// The SF Symbols Jelly's long-press menus use, each with the Material Symbol Android shows
// in its place. A menu item's `image` must be one of these, so a new icon can't miss Android.

import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

export const menuSymbols = {
  clock: 'schedule',
  'clock.arrow.circlepath': 'history',
  'exclamationmark.triangle': 'warning',
  pencil: 'edit',
  plus: 'add',
  pin: 'keep',
  'pin.slash': 'keep_off',
  'arrow.turn.down.right': 'subdirectory_arrow_right',
  'tray.and.arrow.up': 'unarchive',
  archivebox: 'archive',
  trash: 'delete',
} as const satisfies Partial<Record<SFSymbol, AndroidSymbol>>;

export type MenuSymbol = keyof typeof menuSymbols;
