import { AppState } from 'react-native';

/**
 * Keeps release builds current with EAS Update (see scripts/ota.sh). expo-updates on its
 * own applies a downloaded update at the next cold start, and iOS keeps a time tracker
 * alive for days. So: every return to the foreground checks and downloads, and once an
 * update is waiting, the app reloads into it when it goes to the background, where nobody
 * sees the restart. Development builds load from Metro and skip all of this.
 * Call once from the root layout; returns a cleanup function.
 */
export function startUpdates(): () => void {
  if (__DEV__) return () => {};
  let ready = false;
  let checking = false;

  const check = async () => {
    // Imported lazily: development clients don't have the native module.
    const Updates = await import('expo-updates');
    if (!Updates.isEnabled || ready || checking) return;
    checking = true;
    try {
      if ((await Updates.checkForUpdateAsync()).isAvailable) ready = (await Updates.fetchUpdateAsync()).isNew;
    } catch {
      // Offline or the server had trouble: the next foreground tries again.
    } finally {
      checking = false;
    }
  };

  const apply = async () => {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync().catch(() => undefined);
  };

  void check();
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') void check();
    else if (state === 'background' && ready) void apply();
  });
  return () => subscription.remove();
}
