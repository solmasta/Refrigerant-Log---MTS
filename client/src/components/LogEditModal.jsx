import { useState } from 'react';
import Modal from './Modal.jsx';
import { inputClass, Field } from './LogForm.jsx';
import { useReferenceData } from '../hooks/useReferenceData.js';
import { api } from '../api.js';

export default function LogEditModal({ log, onClose, onSaved }) {
  const { refrigerantTypes, serviceTypes, units, loading } = useReferenceData();
  const [form, setForm] = useState({
    date: log.date,
    equipmentId: log.equipmentId,
    location: log.location || '',
    workOrderNumber: log.workOrderNumber || '',
    refrigerantType: log.refrigerantType,
    serviceType: log.serviceType,
    amountAdded: log.amountAdded ?? '',
    amountRecovered: log.amountRecovered ?? '',
    unit: log.unit || 'lbs',
    notes: log.notes || '',
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
      await api.updateLog(log.id, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit log entry" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of service">
            <input required type="date" value={form.date} onChange={update('date')} className={inputClass} />
          </Field>
          <Field label="Equipment ID / Unit #">
            <input
              required
              value={form.equipmentId}
              onChange={update('equipmentId')}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location / Site">
            <input value={form.location} onChange={update('location')} className={inputClass} />
          </Field>
          <Field label="Work order #">
            <input
              value={form.workOrderNumber}
              onChange={update('workOrderNumber')}
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
          <textarea rows={3} value={form.notes} onChange={update('notes')} className={inputClass} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
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
