import { useState } from 'react';

export default function Roster({ technicians, onEdit, onDelete }) {
  const [editingId, setEditingId] = useState(null);

  if (!technicians.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No technicians have signed in yet.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards, no horizontal scrolling */}
      <div className="space-y-3 sm:hidden">
        {technicians.map((t) =>
          editingId === t.id ? (
            <RosterEditCard
              key={t.id}
              technician={t}
              onCancel={() => setEditingId(null)}
              onSave={async (updates) => {
                await onEdit(t.id, updates);
                setEditingId(null);
              }}
            />
          ) : (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900">
                  {t.firstName} {t.lastName}
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    onClick={() => setEditingId(t.id)}
                    className="text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(t.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-700">
                <CardField label="Email" value={t.email || '—'} />
                <CardField label="Onboarded" value={new Date(t.createdAt).toLocaleDateString()} />
                <CardField label="Log entries" value={t.logCount} />
                <CardField label="Purchases" value={t.purchaseCount} />
                <CardField
                  label="Last entry"
                  value={t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : '—'}
                />
              </dl>
            </div>
          )
        )}
      </div>

      {/* sm and up: full table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Technician
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Onboarded
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Log entries
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Purchases
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Last entry
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {technicians.map((t) =>
              editingId === t.id ? (
                <RosterEditRow
                  key={t.id}
                  technician={t}
                  onCancel={() => setEditingId(null)}
                  onSave={async (updates) => {
                    await onEdit(t.id, updates);
                    setEditingId(null);
                  }}
                />
              ) : (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {t.firstName} {t.lastName}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{t.email || '—'}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.logCount}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{t.purchaseCount}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditingId(t.id)}
                      className="text-xs font-medium text-sky-600 hover:text-sky-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="ml-3 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CardField({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function useEditFields(technician) {
  const [firstName, setFirstName] = useState(technician.firstName);
  const [lastName, setLastName] = useState(technician.lastName);
  const [email, setEmail] = useState(technician.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return { firstName, setFirstName, lastName, setLastName, email, setEmail, saving, setSaving, error, setError };
}

function RosterEditCard({ technician, onSave, onCancel }) {
  const f = useEditFields(technician);

  async function handleSave() {
    f.setError('');
    if (!f.firstName.trim() || !f.lastName.trim()) {
      f.setError('First and last name are required');
      return;
    }
    f.setSaving(true);
    try {
      await onSave({ firstName: f.firstName, lastName: f.lastName, email: f.email });
    } catch (err) {
      f.setError(err.message);
      f.setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm">
      <div className="flex gap-2">
        <input
          value={f.firstName}
          onChange={(e) => f.setFirstName(e.target.value)}
          placeholder="First name"
          className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
        />
        <input
          value={f.lastName}
          onChange={(e) => f.setLastName(e.target.value)}
          placeholder="Last name"
          className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
        />
      </div>
      <input
        type="email"
        value={f.email}
        onChange={(e) => f.setEmail(e.target.value)}
        placeholder="email@example.com"
        className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
      />
      {f.error && <p className="mt-1 text-xs text-red-600">{f.error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          onClick={handleSave}
          disabled={f.saving}
          className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {f.saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="text-xs font-medium text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

function RosterEditRow({ technician, onSave, onCancel }) {
  const f = useEditFields(technician);

  async function handleSave() {
    f.setError('');
    if (!f.firstName.trim() || !f.lastName.trim()) {
      f.setError('First and last name are required');
      return;
    }
    f.setSaving(true);
    try {
      await onSave({ firstName: f.firstName, lastName: f.lastName, email: f.email });
    } catch (err) {
      f.setError(err.message);
      f.setSaving(false);
    }
  }

  return (
    <tr className="bg-sky-50/60">
      <td className="px-3 py-2">
        <div className="flex gap-1.5">
          <input
            value={f.firstName}
            onChange={(e) => f.setFirstName(e.target.value)}
            placeholder="First name"
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
          />
          <input
            value={f.lastName}
            onChange={(e) => f.setLastName(e.target.value)}
            placeholder="Last name"
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
          />
        </div>
        {f.error && <p className="mt-1 text-xs text-red-600">{f.error}</p>}
      </td>
      <td className="px-3 py-2">
        <input
          type="email"
          value={f.email}
          onChange={(e) => f.setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full min-w-[10rem] rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200"
        />
      </td>
      <td className="px-3 py-2 text-slate-400" colSpan={3}>
        —
      </td>
      <td className="px-3 py-2 text-right whitespace-nowrap" colSpan={2}>
        <button
          onClick={handleSave}
          disabled={f.saving}
          className="rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {f.saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="ml-2 text-xs font-medium text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </td>
    </tr>
  );
}
