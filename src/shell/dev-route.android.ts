/**
 * Development only on iOS (see dev-route.ts). Android has no launch arguments in
 * NSUserDefaults; scripts/emu.sh opens routes as hopwatch:// links instead.
 */
export const devLaunchRoute = (): string | null => null;
