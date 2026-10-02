// JSON export through the share sheet, and the restore that reads it back: the backup
// while there is no server, the way to move data between installs, and raw material for
// ad-hoc analysis. The format lives in backup.ts.

import { getDocumentAsync } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { coreText } from '@/i18n/core';

import { backupPayload, type ParseResult, parseBackup } from './backup';
import * as db from './db';
import { useStint } from './store';

export async function shareExport(): Promise<void> {
  const exportedAt = new Date();
  const payload = backupPayload({ ...db.dumpAll(), prefs: { ...useStint.getState().prefs } }, exportedAt);
  const file = new File(Paths.cache, `hopwatch-export-${exportedAt.toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: coreText.exportTitle });
}

/**
 * Lets the user pick an export file and checks it. Resolves to null when they cancel.
 * Nothing changes until the caller passes the backup to `actions.restore`.
 */
export async function pickBackup(): Promise<ParseResult | null> {
  const picked = await getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const file = new File(picked.assets[0].uri);
  try {
    return parseBackup(JSON.parse(await file.text()));
  } catch {
    return { ok: false, reason: coreText.backup.notAnExport };
  } finally {
    if (file.exists) file.delete();
  }
}
