import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import LogForm from '../components/LogForm.jsx';
import PurchaseForm from '../components/PurchaseForm.jsx';
import LogsTable from '../components/LogsTable.jsx';
import PurchasesTable from '../components/PurchasesTable.jsx';
import { api } from '../api.js';

const TABS = [
  { id: 'log', label: 'Log Usage' },
  { id: 'purchase', label: 'Log Purchase' },
  { id: 'history', label: 'My Entries' },
];

export default function TechnicianDashboard() {
  const [tab, setTab] = useState('log');
  const [logs, setLogs] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const refresh = useCallback(() => {
    api.listLogs().then((d) => setLogs(d.logs));
    api.listPurchases().then((d) => setPurchases(d.purchases));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Field Log</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record refrigerant usage and purchases. Entries are saved to the shared team log.
        </p>

        <div className="mt-6 flex gap-1 rounded-lg bg-slate-200/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
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
          {tab === 'log' && <LogForm onSaved={refresh} />}
          {tab === 'purchase' && <PurchaseForm onSaved={refresh} />}
          {tab === 'history' && (
            <div className="space-y-8">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent usage logs</h2>
                <LogsTable logs={logs} />
              </div>
              <div>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent purchases</h2>
                <PurchasesTable purchases={purchases} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
