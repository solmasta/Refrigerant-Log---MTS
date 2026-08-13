import { api } from '../api.js';
import { getPendingEntries, removePendingEntry, markEntryError } from './offlineQueue.js';

export async function syncPendingEntries() {
  const pending = await getPendingEntries();
  let synced = 0;
  let authExpired = false;

  for (const entry of pending) {
    if (authExpired) break; // no point trying more until the technician re-logs in
    try {
      if (entry.type === 'log') {
        await api.createLog(entry.payload);
      } else {
        await api.createPurchase(entry.payload);
      }
      await removePendingEntry(entry.localId);
      synced += 1;
    } catch (err) {
      if (err.isNetworkError) break; // still offline, stop trying, wait for next trigger
      if (err.isAuthError) authExpired = true;
      await markEntryError(entry.localId, err.message);
    }
  }

  const remaining = await getPendingEntries();
  return { synced, remaining: remaining.length, authExpired };
}
