// JSON export through the share sheet: the backup while there is no server, and the
// raw material for ad-hoc analysis. Soft-deleted rows are included.

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import * as db from './db';
import { defaultHueHex } from './model';

export async function shareExport(): Promise<void> {
  const { contexts, entries } = db.dumpAll();
  const exportedAt = new Date();
  const payload = {
    app: 'stint',
    schemaVersion: 1,
    exportedAt: exportedAt.toISOString(),
    contexts: contexts.map((c) => ({ ...c, colorHex: c.color ? defaultHueHex[c.color] : null })),
    entries,
  };
  const file = new File(Paths.cache, `stint-export-${exportedAt.toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export Stint data' });
}
