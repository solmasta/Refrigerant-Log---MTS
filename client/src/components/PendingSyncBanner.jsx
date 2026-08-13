import { useCallback, useEffect, useState } from 'react';
import { syncPendingEntries } from '../utils/syncOfflineEntries.js';

export default function PendingSyncBanner({ pendingCount, onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);

  const attemptSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncPendingEntries();
      setAuthExpired(result.authExpired);
      if (result.synced > 0) onSynced?.();
    } finally {
      setSyncing(false);
    }
  }, [onSynced]);

  useEffect(() => {
    attemptSync();
    window.addEventListener('online', attemptSync);
    return () => window.removeEventListener('online', attemptSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-800">
        {pendingCount} {pendingCount === 1 ? 'entry' : 'entries'} saved on this device, waiting to
        sync.
        {authExpired && ' Log in again to send them.'}
      </p>
      <button
        onClick={attemptSync}
        disabled={syncing}
        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  );
}
