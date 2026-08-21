import { useCallback, useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import StatCard from '../components/StatCard.jsx';
import Roster from '../components/Roster.jsx';
import LogsTable from '../components/LogsTable.jsx';
import PurchasesTable from '../components/PurchasesTable.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import Modal from '../components/Modal.jsx';
import EmailTemplateModal from '../components/EmailTemplateModal.jsx';
import { api, exportUrl, backupUrl } from '../api.js';
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

  async function handleAddTechnician(payload) {
    await api.createTechnician(payload);
    refresh();
  }

  async function handleEditTechnician(id, updates) {
    await api.updateTechnician(id, updates);
    refresh();
    refreshEntries();
  }

  async function handleDeleteTechnician(id) {
    if (
      !confirm(
        'Remove this technician from the roster? Their past log entries and purchases will be kept for your records, but they will need to be re-added to log new entries.'
      )
    )
      return;
    await api.deleteTechnician(id);
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
    <div className="min-h-dvh bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Team roster, refrigerant usage, purchases, and EPA-ready exports.
            </p>
          </div>
          <ExportMenu
            className="self-end sm:self-auto"
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

        <div className="mt-6 grid grid-cols-5 gap-1.5 rounded-lg bg-slate-200/60 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-0.5 py-2 text-center text-[11px] font-medium leading-tight transition sm:px-4 sm:text-sm ${
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
            <Roster
              technicians={technicians}
              onAdd={handleAddTechnician}
              onEdit={handleEditTechnician}
              onDelete={handleDeleteTechnician}
            />
          </div>
        )}

        {tab === 'settings' && (
          <>
            <ReminderEmailsCard technicians={technicians} />
            <BackupsCard />
            <AdminSettings />
          </>
        )}
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

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const REMINDER_TEMPLATES = [
  {
    id: 'monthly',
    label: 'Monthly deadline reminder',
    description: 'The usual "your entries are due by end of month" notice.',
  },
  {
    id: 'welcome',
    label: 'Friendly reminder (how to use the app)',
    description:
      'A plain-language recap of what the app is for and how to log in — good for a second nudge to anyone who hasn’t gotten started yet.',
  },
];

function ReminderEmailsCard({ technicians = [] }) {
  const [reminderDay, setReminderDay] = useState(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayInput, setDayInput] = useState(28);
  const [savingDay, setSavingDay] = useState(false);
  const [dayMessage, setDayMessage] = useState('');
  const [dayError, setDayError] = useState('');

  const [template, setTemplate] = useState('monthly');
  const [recipientMode, setRecipientMode] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [emailClient, setEmailClient] = useState(null);
  const [emailClientLoading, setEmailClientLoading] = useState(false);

  function toggleSelected(id) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function currentRecipients() {
    const emailable = technicians.filter((t) => t.email && t.email.trim());
    return recipientMode === 'select' ? emailable.filter((t) => selectedIds.includes(t.id)) : emailable;
  }

  useEffect(() => {
    api
      .getReminderSettings()
      .then((d) => {
        setReminderDay(d.reminderDay);
        setDayInput(d.reminderDay);
      })
      .finally(() => setDayLoading(false));
  }, []);

  async function handleSaveDay() {
    setSavingDay(true);
    setDayError('');
    setDayMessage('');
    try {
      const res = await api.updateReminderSettings(Number(dayInput));
      setReminderDay(res.reminderDay);
      setDayMessage('Saved.');
      setTimeout(() => setDayMessage(''), 3000);
    } catch (err) {
      setDayError(err.message);
    } finally {
      setSavingDay(false);
    }
  }

  async function handlePreview() {
    setPreviewError('');
    setPreviewLoading(true);
    try {
      const previewTechnicianId =
        recipientMode === 'select' && selectedIds.length === 1 ? selectedIds[0] : null;
      const res = await api.previewReminder(template, previewTechnicianId);
      setPreview(res);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleOpenEmailClient() {
    setError('');
    const recipients = currentRecipients();
    if (recipients.length === 0) {
      setError(
        recipientMode === 'select'
          ? 'Select at least one technician with an email on file.'
          : 'No technicians have an email on file yet.'
      );
      return;
    }
    setEmailClientLoading(true);
    try {
      // Mailto opens one compose window for everyone at once, so it can't
      // greet each recipient by name the way an automated send does --
      // fall back to a group-friendly "Hi team," unless there's exactly
      // one recipient, in which case we can still personalize it.
      const singleId = recipients.length === 1 ? recipients[0].id : null;
      const res = await api.previewReminder(template, singleId);
      const body = recipients.length > 1 ? res.text.replace(/^Hi Jordan,/, 'Hi team,') : res.text;
      setEmailClient({ subject: res.subject, body, to: recipients.map((r) => r.email).join(', ') });
    } catch (err) {
      setError(err.message);
    } finally {
      setEmailClientLoading(false);
    }
  }

  async function handleSend() {
    setError('');
    if (recipientMode === 'select' && selectedIds.length === 0) {
      setError('Select at least one technician, or switch to "Everyone with an email".');
      return;
    }

    const templateLabel = REMINDER_TEMPLATES.find((t) => t.id === template)?.label || template;
    const recipientDescription =
      recipientMode === 'select'
        ? `${selectedIds.length} selected technician${selectedIds.length === 1 ? '' : 's'}`
        : 'every technician with an email on file';
    const confirmMessage =
      template === 'monthly' && recipientMode === 'all'
        ? `Send the monthly deadline reminder right now to every technician with an email on file? This is the same email that goes out automatically on the ${reminderDay ? ordinal(reminderDay) : '28th'} of each month.`
        : `Send the "${templateLabel}" email right now to ${recipientDescription}?`;
    if (!confirm(confirmMessage)) return;

    setSending(true);
    setResult(null);
    try {
      const technicianIds = recipientMode === 'select' ? selectedIds : null;
      const res = await api.sendReminders(template, technicianIds);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Monthly reminder emails</h2>
      <p className="mt-1 text-sm text-slate-500">
        Every technician with an email on file automatically gets a reminder on the{' '}
        {dayLoading ? '…' : ordinal(reminderDay)} of each month to log any outstanding entries. In
        shorter months, it fires on the last real day instead of skipping.
      </p>

      <div className="mt-4 flex items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Reminder day</span>
          <select
            value={dayInput}
            onChange={(e) => setDayInput(e.target.value)}
            disabled={dayLoading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {ordinal(d)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleSaveDay}
          disabled={savingDay || dayLoading || Number(dayInput) === reminderDay}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {savingDay ? 'Saving…' : 'Save'}
        </button>
      </div>
      {dayMessage && <p className="mt-1 text-xs text-emerald-600">{dayMessage}</p>}
      {dayError && <p className="mt-1 text-xs text-red-600">{dayError}</p>}

      <label className="mt-5 block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Email template</span>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          {REMINDER_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-slate-500">
          {REMINDER_TEMPLATES.find((t) => t.id === template)?.description}
        </span>
      </label>

      <div className="mt-5">
        <span className="mb-1 block text-xs font-medium text-slate-600">Send to</span>
        <div className="flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={recipientMode === 'all'}
              onChange={() => setRecipientMode('all')}
            />
            Everyone with an email
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              checked={recipientMode === 'select'}
              onChange={() => setRecipientMode('select')}
            />
            Specific technicians
          </label>
        </div>

        {recipientMode === 'select' && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            {technicians.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">No technicians on the roster yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {technicians.map((t) => {
                  const hasEmail = Boolean(t.email && t.email.trim());
                  return (
                    <li key={t.id}>
                      <label
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${hasEmail ? 'cursor-pointer' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          disabled={!hasEmail}
                          onChange={() => toggleSelected(t.id)}
                        />
                        <span className={hasEmail ? 'text-slate-800' : 'text-slate-400'}>
                          {t.firstName} {t.lastName}
                        </span>
                        <span className="ml-auto text-xs text-slate-400">
                          {hasEmail ? t.email : 'no email on file'}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={handleSend}
          disabled={sending}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {sending ? 'Sending…' : 'Send reminder emails now'}
        </button>
        <button
          onClick={handlePreview}
          disabled={previewLoading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {previewLoading ? 'Loading…' : 'Preview'}
        </button>
        <button
          onClick={handleOpenEmailClient}
          disabled={emailClientLoading}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {emailClientLoading ? 'Loading…' : 'Open in email app'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        "Send reminder emails now" sends automatically from this app. "Open in email app" instead
        pre-fills your own Mail/Gmail app so you send it yourself — useful if automated sending
        isn't set up yet.
      </p>
      {previewError && <p className="mt-2 text-sm text-red-600">{previewError}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {result && (
        <div className="mt-3 text-sm">
          <p className="text-emerald-600">
            Sent to {result.sent.length} technician{result.sent.length === 1 ? '' : 's'}.
          </p>
          {result.skippedNoEmail > 0 && (
            <p className="mt-1 text-slate-500">
              Skipped {result.skippedNoEmail} with no email on file.
            </p>
          )}
          {result.failed.length > 0 && (
            <div className="mt-1 text-red-600">
              <p>Failed to send to {result.failed.length}:</p>
              <ul className="ml-4 list-disc">
                {result.failed.map((f) => (
                  <li key={f.email}>
                    {f.email} — {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {preview && (
        <Modal title="Email preview" onClose={() => setPreview(null)}>
          <div className="space-y-3 text-sm">
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">Subject</span>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-900">
                {preview.subject}
              </p>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Body (as it will appear in the recipient's inbox)
              </span>
              <iframe
                title="Email body preview"
                sandbox=""
                srcDoc={`<body style="margin:0;padding:12px;font-family:sans-serif;font-size:14px;color:#334155;">${preview.html}</body>`}
                className="h-72 w-full rounded-lg border border-slate-200 bg-white"
              />
            </div>
            <p className="text-xs text-slate-400">
              {recipientMode === 'select' && selectedIds.length === 1
                ? "Shown with this technician's actual first name."
                : 'Shown with a placeholder name — each technician receives it with their own first name filled in.'}
            </p>
          </div>
        </Modal>
      )}

      {emailClient && (
        <EmailTemplateModal
          subject={emailClient.subject}
          body={emailClient.body}
          initialTo={emailClient.to}
          onClose={() => setEmailClient(null)}
        />
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function BackupsCard() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .listBackups()
      .then((d) => setBackups(d.backups))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleBackupNow() {
    setCreating(true);
    setError('');
    try {
      await api.createBackup();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const latest = backups[0];

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Database backups</h2>
      <p className="mt-1 text-sm text-slate-500">
        A full snapshot of the roster, usage logs, and purchases is saved to Cloudflare R2
        automatically every day and kept for 90 days.
      </p>

      <p className="mt-3 text-xs text-slate-500">
        {loading
          ? 'Loading…'
          : latest
            ? `Last backup: ${new Date(latest.uploaded).toLocaleString()}`
            : 'No backups yet.'}
      </p>

      <button
        onClick={handleBackupNow}
        disabled={creating}
        className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {creating ? 'Backing up…' : 'Back up now'}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {backups.length > 0 && (
        <ul className="mt-4 max-h-48 divide-y divide-slate-100 overflow-y-auto text-sm">
          {backups.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-slate-800">{new Date(b.uploaded).toLocaleString()}</p>
                <p className="text-xs text-slate-500">{formatBytes(b.size)}</p>
              </div>
              <a
                href={backupUrl(b.key)}
                className="shrink-0 text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                Download
              </a>
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
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="New 4-digit PIN"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={filterInput + ' w-full'}
        />
        <input
          type="password"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="Confirm 4-digit PIN"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
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
