// Restore from an export, as offered in Settings and on the welcome screen: pick the file,
// check it, say what's in it and confirm. The caller applies it with `actions.restore`.

import { Alert } from 'react-native';

import { type Backup, formatLongDay, pickBackup } from '@/core';
import { settingsText } from '@/i18n/settings';

const { data } = settingsText;

/**
 * Resolves to the picked backup once the user confirms, or null when they cancel or the
 * file can't be restored (after saying why). `replacing` warns that current data goes.
 */
export async function chooseBackup(replacing: boolean): Promise<Backup | null> {
  const result = await pickBackup().catch((e: unknown) => ({ ok: false as const, reason: String(e) }));
  if (!result) return null;
  if (!result.ok) {
    Alert.alert(data.cantRestore, result.reason);
    return null;
  }
  const { backup } = result;
  const jellies = backup.contexts.filter((c) => c.deletedAt === null).length;
  const entries = backup.entries.filter((e) => e.deletedAt === null).length;
  const day = backup.exportedAt ? formatLongDay(backup.exportedAt) : null;
  const confirmed = await new Promise<boolean>((resolve) =>
    Alert.alert(
      data.restoreTitle,
      data.restoreMessage(day, jellies, entries, replacing),
      [
        { text: settingsText.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: data.restoreConfirm, style: replacing ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      // Android: Back and tapping outside cancel, like any dialog there.
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
  return confirmed ? backup : null;
}
