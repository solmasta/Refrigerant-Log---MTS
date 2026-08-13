import { useState } from 'react';
import { api } from '../api.js';
import { useReferenceData } from '../hooks/useReferenceData.js';

const todayIso = () => new Date().toISOString().slice(0, 10);

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

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await api.createLog(form);
      setForm({ ...emptyForm, date: todayIso() });
      setSuccess(true);
      onSaved?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date of service">
          <input
            required
            type="date"
            value={form.date}
            onChange={update('date')}
            className={inputClass}
          />
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
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amountAdded}
            onChange={update('amountAdded')}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>
        <Field label="Amount recovered">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amountRecovered}
            onChange={update('amountRecovered')}
            placeholder="0.00"
            className={inputClass}
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export { inputClass, Field };
