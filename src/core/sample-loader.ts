import { randomUUID } from 'expo-crypto';

import { sampleData } from './sample';
import { actions } from './store';
import { offsetAt } from './time';

/** Replaces all contexts and entries with three weeks of sample data. */
export function loadSampleData() {
  actions.replaceAll(sampleData(Date.now(), randomUUID, offsetAt));
}

/** Deletes all contexts and entries. */
export function eraseAllData() {
  actions.replaceAll({ contexts: [], entries: [] });
}
