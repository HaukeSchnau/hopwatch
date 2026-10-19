/**
 * Development only on iOS (see dev-route.ts). Android has no launch arguments in
 * NSUserDefaults; routes open as hopwatch:// links instead (`adb shell am start -d hopwatch://…`).
 */
export const devLaunchRoute = (): string | null => null;
