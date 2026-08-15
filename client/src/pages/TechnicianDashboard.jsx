import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import LogForm from '../components/LogForm.jsx';
import PurchaseForm from '../components/PurchaseForm.jsx';
import LogsTable from '../components/LogsTable.jsx';
import PurchasesTable from '../components/PurchasesTable.jsx';
import PendingSyncBanner from '../components/PendingSyncBanner.jsx';
import { api } from '../api.js';
import { getPendingEntries } from '../utils/offlineQueue.js';

const TABS = [
  { id: 'log', label: 'Log Usage' },
  { id: 'purchase', label: 'Log Purchase' },
  { id: 'history', label: 'My Entries' },
];

export default function TechnicianDashboard() {
  const [tab, setTab] = useState('log');
  const [logs, setLogs] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [pendingPurchases, setPendingPurchases] = useState([]);

  const refresh = useCallback(() => {
    api.listLogs().then((d) => setLogs(d.logs));
    api.listPurchases().then((d) => setPurchases(d.purchases));
  }, []);

  const refreshPending = useCallback(async () => {
    const pending = await getPendingEntries();
    setPendingLogs(
      pending
        .filter((e) => e.type === 'log')
        .map((e) => ({ id: e.localId, pending: true, syncError: e.lastError, ...e.payload }))
    );
    setPendingPurchases(
      pending
        .filter((e) => e.type === 'purchase')
        .map((e) => ({ id: e.localId, pending: true, syncError: e.lastError, ...e.payload }))
    );
  }, []);

  const refreshAll = useCallback(() => {
    refresh();
    refreshPending();
  }, [refresh, refreshPending]);

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Field Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record refrigerant usage and purchases. Entries are saved to the shared team log.
        </p>

        <div className="mt-6">
          <PendingSyncBanner
            pendingCount={pendingLogs.length + pendingPurchases.length}
            onSynced={refreshAll}
          />
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1 sm:grid sm:grid-cols-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition sm:shrink ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {tab === 'log' && <LogForm onSaved={refreshAll} />}
          {tab === 'purchase' && <PurchaseForm onSaved={refreshAll} />}
          {tab === 'history' && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent usage logs</h2>
                <LogsTable logs={[...pendingLogs, ...logs]} />
              </div>
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent purchases</h2>
                <PurchasesTable purchases={[...pendingPurchases, ...purchases]} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
