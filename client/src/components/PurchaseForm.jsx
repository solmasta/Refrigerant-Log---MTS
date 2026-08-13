import { useState } from 'react';
import { api } from '../api.js';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { inputClass, Field } from './LogForm.jsx';

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  date: todayIso(),
  refrigerantType: '',
  quantity: '',
  unit: 'lbs',
  cost: '',
  supplier: '',
  invoiceNumber: '',
  notes: '',
};

export default function PurchaseForm({ onSaved }) {
  const { refrigerantTypes, units, loading } = useReferenceData();
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
      await api.createPurchase(form);
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
        <Field label="Purchase date">
          <input
            required
            type="date"
            value={form.date}
            onChange={update('date')}
            className={inputClass}
          />
        </Field>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Quantity">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.quantity}
            onChange={update('quantity')}
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
        <Field label="Cost ($)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.cost}
            onChange={update('cost')}
            placeholder="0.00"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier">
          <input
            value={form.supplier}
            onChange={update('supplier')}
            placeholder="Airgas, Ferguson, ..."
            className={inputClass}
          />
        </Field>
        <Field label="Invoice #">
          <input
            value={form.invoiceNumber}
            onChange={update('invoiceNumber')}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={2}
          value={form.notes}
          onChange={update('notes')}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Purchase logged.</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60 sm:w-auto"
      >
        {saving ? 'Saving…' : 'Save purchase'}
      </button>
    </form>
  );
}
