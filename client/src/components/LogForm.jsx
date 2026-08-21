import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { queueEntry } from '../utils/offlineQueue.js';

const todayIso = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// Covers the vast majority of repair/top-off amounts as one-tap picks.
// Larger jobs (e.g. decommissioning a big chiller) fall back to "Other".
const AMOUNT_OPTIONS = {
  lbs: Array.from({ length: 51 }, (_, i) => i), // 0-50 lbs
  oz: Array.from({ length: 17 }, (_, i) => i), // 0-16 oz
};

const emptyForm = {
  date: todayIso(),
  equipmentId: '',
  location: '',
  workOrderNumber: '',
  refrigerantType: '',
  serviceType: '',
  amountAdded: '',
  amountRecovered: '',
  unit: 'lbs',
  notes: '',
};

export default function LogForm({ onSaved }) {
  const { refrigerantTypes, serviceTypes, units, loading } = useReferenceData();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [queueFailed, setQueueFailed] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    setSavedOffline(false);
    setQueueFailed(false);
    try {
      await api.createLog(form);
      setForm({ ...emptyForm, date: todayIso() });
      setSuccess(true);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err.isNetworkError) {
        try {
          await queueEntry('log', form);
          setForm({ ...emptyForm, date: todayIso() });
          setSavedOffline(true);
          onSaved?.();
        } catch {
          // Saving to the device itself failed (e.g. private browsing
          // blocks IndexedDB, or storage is full) — the ONLY safety net
          // just failed too, so don't clear the form. Leave everything
          // on screen so the technician can at least see/screenshot it.
          setQueueFailed(true);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of service">
          <div className="flex gap-2">
            <input
              required
              type="date"
              value={form.date}
              onChange={update('date')}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, date: todayIso() }))}
              className="shrink-0 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, date: isoDaysAgo(1) }))}
              className="shrink-0 rounded-lg border border-slate-300 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Yesterday
            </button>
          </div>
        </Field>
        <Field label="Equipment ID / Unit #">
          <input
            required
            value={form.equipmentId}
            onChange={update('equipmentId')}
            placeholder="RTU-4, Walk-in #2, ..."
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location / Site">
          <input
            value={form.location}
            onChange={update('location')}
            placeholder="123 Main St - Rooftop"
            className={inputClass}
          />
        </Field>
        <Field label="Work order #">
          <input
            value={form.workOrderNumber}
            onChange={update('workOrderNumber')}
            placeholder="WO-10293"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Refrigerant type">
          <select
            required
            value={form.refrigerantType}
            onChange={update('refrigerantType')}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select refrigerant…</option>
            {refrigerantTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Service type">
          <select
            required
            value={form.serviceType}
            onChange={update('serviceType')}
            className={inputClass}
            disabled={loading}
          >
            <option value="">Select service…</option>
            {serviceTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Amount added">
          <AmountSelect
            value={form.amountAdded}
            unit={form.unit}
            onChange={(v) => setForm((f) => ({ ...f, amountAdded: v }))}
          />
        </Field>
        <Field label="Amount recovered">
          <AmountSelect
            value={form.amountRecovered}
            unit={form.unit}
            onChange={(v) => setForm((f) => ({ ...f, amountRecovered: v }))}
          />
        </Field>
        <Field label="Unit">
          <select value={form.unit} onChange={update('unit')} className={inputClass}>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={3}
          value={form.notes}
          onChange={update('notes')}
          placeholder="Leak found at braze joint, repaired and pressure tested..."
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Log entry saved.</p>}
      {savedOffline && (
        <p className="text-sm text-amber-600">
          No connection right now — this entry is saved on your device and will send
          automatically once you're back online.
        </p>
      )}
      {queueFailed && (
        <p className="text-sm font-medium text-red-600">
          Couldn't save this entry — no connection, and this device also couldn't store it for
          later (this can happen in private/incognito browsing). Don't close this page. Please
          take a screenshot or write down these details as a backup, then try Save again once
          you have a connection.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
      >
        {saving ? 'Saving…' : 'Save log entry'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50';

// A dropdown of whole-number presets for the common case, with a manual
// number entry that appears for anything the presets can't express (a
// fraction, or a large decommission job) -- so EPA record accuracy never
// depends on the preset list covering every possible amount.
function AmountSelect({ value, unit, onChange }) {
  const options = AMOUNT_OPTIONS[unit] || AMOUNT_OPTIONS.lbs;
  const numericValue = value === '' ? null : Number(value);
  const matchesPreset =
    numericValue !== null && Number.isInteger(numericValue) && options.includes(numericValue);
  const [otherMode, setOtherMode] = useState(value !== '' && !matchesPreset);

  // A form reset (e.g. after saving) clears the value from outside this
  // component -- drop back out of "Other" mode when that happens.
  useEffect(() => {
    if (value === '') setOtherMode(false);
  }, [value]);

  const showOther = otherMode || (value !== '' && !matchesPreset);

  function handleSelect(e) {
    const raw = e.target.value;
    if (raw === 'other') {
      setOtherMode(true);
      onChange('');
    } else {
      setOtherMode(false);
      onChange(raw);
    }
  }

  return (
    <div className="space-y-1.5">
      <select value={showOther ? 'other' : value} onChange={handleSelect} className={inputClass}>
        <option value="">Select…</option>
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
        <option value="other">Other (exact amount)…</option>
      </select>
      {showOther && (
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Exact amount"
          className={inputClass}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export { inputClass, Field };
