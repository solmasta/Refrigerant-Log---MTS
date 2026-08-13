import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import StatCard from '../components/StatCard.jsx';
import Roster from '../components/Roster.jsx';
import LogsTable from '../components/LogsTable.jsx';
import PurchasesTable from '../components/PurchasesTable.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import { api, exportUrl } from '../api.js';
import { useReferenceData } from '../hooks/useReferenceData.js';
import {
  buildCombinedCsv,
  buildCombinedReport,
  buildLogsReport,
  buildPurchasesReport,
  buildRosterCsv,
  buildRosterReport,
} from '../utils/reportBuilders.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'logs', label: 'Usage Logs' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'roster', label: 'Roster' },
  { id: 'settings', label: 'Settings' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [logs, setLogs] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [filters, setFilters] = useState({ technicianId: '', refrigerantType: '', dateFrom: '', dateTo: '' });
  const { refrigerantTypes } = useReferenceData();

  const refresh = useCallback(() => {
    api.adminSummary().then(setSummary);
    api.technicians().then((d) => setTechnicians(d.technicians));
  }, []);

  const refreshEntries = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    api.listLogs(params).then((d) => setLogs(d.logs));
    api.listPurchases(params).then((d) => setPurchases(d.purchases));
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  async function handleDeleteLog(id) {
    if (!confirm('Delete this log entry? This cannot be undone.')) return;
    await api.deleteLog(id);
    refreshEntries();
    refresh();
  }

  async function handleDeletePurchase(id) {
    if (!confirm('Delete this purchase entry? This cannot be undone.')) return;
    await api.deletePurchase(id);
    refreshEntries();
    refresh();
  }

  // Always pulls fresh, unfiltered data — independent of whatever filters
  // happen to be set on the Logs/Purchases tabs — so "everything" really is.
  async function fetchAllData() {
    const [techData, logData, purchaseData] = await Promise.all([
      api.technicians(),
      api.listLogs({}),
      api.listPurchases({}),
    ]);
    return { technicians: techData.technicians, logs: logData.logs, purchases: purchaseData.purchases };
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Team roster, refrigerant usage, purchases, and EPA-ready exports.
            </p>
          </div>
          <ExportMenu
            label="Export Everything"
            buildCsv={async () => {
              const { technicians: t, logs: l, purchases: p } = await fetchAllData();
              return buildCombinedCsv(t, l, p);
            }}
            buildReport={async () => {
              const { technicians: t, logs: l, purchases: p } = await fetchAllData();
              return buildCombinedReport(t, l, p);
            }}
          />
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && summary && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Technicians" value={summary.technicianCount} accent="sky" />
            <StatCard label="Log entries" value={summary.logCount} accent="violet" />
            <StatCard
              label="Recovered vs. added"
              value={`${summary.totalRecoveredLbs.toFixed(1)} / ${summary.totalAddedLbs.toFixed(1)} lbs`}
              sub="Recovered / Added across all logs"
              accent="emerald"
            />
            <StatCard
              label="Purchased"
              value={`${summary.totalPurchasedLbs.toFixed(1)} lbs`}
              sub={`$${summary.totalSpent.toFixed(2)} spent · ${summary.purchaseCount} orders`}
              accent="amber"
            />
          </div>
        )}

        {tab === 'overview' && <RecentActivity logs={logs} purchases={purchases} />}

        {(tab === 'logs' || tab === 'purchases') && (
          <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <FilterField label="Technician">
              <select
                value={filters.technicianId}
                onChange={(e) => setFilters((f) => ({ ...f, technicianId: e.target.value }))}
                className={filterInput}
              >
                <option value="">All</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="Refrigerant">
              <select
                value={filters.refrigerantType}
                onChange={(e) => setFilters((f) => ({ ...f, refrigerantType: e.target.value }))}
                className={filterInput}
              >
                <option value="">All</option>
                {refrigerantTypes.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label="From">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className={filterInput}
              />
            </FilterField>
            <FilterField label="To">
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className={filterInput}
              />
            </FilterField>
            <div className="ml-auto">
              <ExportMenu
                csvHref={exportUrl(tab === 'logs' ? 'logs' : 'purchases')}
                buildReport={() =>
                  tab === 'logs'
                    ? buildLogsReport(logs, filters, technicians)
                    : buildPurchasesReport(purchases, filters, technicians)
                }
              />
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="mt-4">
            <LogsTable logs={logs} showTechnician onDelete={handleDeleteLog} />
          </div>
        )}

        {tab === 'purchases' && (
          <div className="mt-4">
            <PurchasesTable purchases={purchases} showTechnician onDelete={handleDeletePurchase} />
          </div>
        )}

        {tab === 'roster' && (
          <div className="mt-6">
            <div className="mb-3 flex justify-end">
              <ExportMenu
                buildCsv={() => buildRosterCsv(technicians)}
                buildReport={() => buildRosterReport(technicians)}
              />
            </div>
            <Roster technicians={technicians} />
          </div>
        )}

        {tab === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const filterInput =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';

function RecentActivity({ logs, purchases }) {
  const items = [
    ...logs.map((l) => ({
      id: `log-${l.id}`,
      createdAt: l.createdAt,
      text: `${l.technicianName} logged ${l.serviceType.toLowerCase()} on ${l.equipmentId}`,
      detail: `${l.refrigerantType} · ${l.date}`,
      accent: 'bg-violet-100 text-violet-700',
      tag: 'Log',
    })),
    ...purchases.map((p) => ({
      id: `purchase-${p.id}`,
      createdAt: p.createdAt,
      text: `${p.technicianName} purchased ${p.quantity} ${p.unit} of ${p.refrigerantType}`,
      detail: `${p.supplier || 'No supplier noted'} · ${p.date}`,
      accent: 'bg-amber-100 text-amber-700',
      tag: 'Purchase',
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Nothing logged yet. Entries will show up here as the team records usage and purchases.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${item.accent}`}
              >
                {item.tag}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-800">{item.text}</p>
                <p className="text-xs text-slate-500">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminSettings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    setSaving(true);
    try {
      await api.adminChangePassword(currentPassword, newPassword);
      setMessage('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Change admin password</h2>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="password"
          required
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={filterInput + ' w-full'}
        />
        <input
          type="password"
          required
          placeholder="New password (min. 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={filterInput + ' w-full'}
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={filterInput + ' w-full'}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-emerald-600">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
