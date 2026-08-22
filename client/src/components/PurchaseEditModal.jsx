import { useState } from 'react';
import Modal from './Modal.jsx';
import { inputClass, Field } from './LogForm.jsx';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { api } from '../api.js';

export default function PurchaseEditModal({ purchase, onClose, onSaved }) {
  const { refrigerantTypes, units, loading } = useReferenceData();
  const [form, setForm] = useState({
    date: purchase.date,
    refrigerantType: purchase.refrigerantType,
    quantity: purchase.quantity ?? '',
    unit: purchase.unit || 'lbs',
    cost: purchase.cost ?? '',
    supplier: purchase.supplier || '',
    invoiceNumber: purchase.invoiceNumber || '',
    notes: purchase.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updatePurchase(purchase.id, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit purchase" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Purchase date">
            <input required type="date" value={form.date} onChange={update('date')} className={inputClass} />
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
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier">
            <input value={form.supplier} onChange={update('supplier')} className={inputClass} />
          </Field>
          <Field label="Invoice #">
            <input value={form.invoiceNumber} onChange={update('invoiceNumber')} className={inputClass} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea rows={2} value={form.notes} onChange={update('notes')} className={inputClass} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
