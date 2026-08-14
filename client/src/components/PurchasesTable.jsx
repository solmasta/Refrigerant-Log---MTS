import { Th, Td, PendingBadge, hasValue } from './LogsTable.jsx';

export default function PurchasesTable({ purchases, showTechnician = false, onDelete }) {
  if (!purchases.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No purchases logged yet.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards, no horizontal scrolling */}
      <div className="space-y-3 sm:hidden">
        {purchases.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border border-slate-200 p-4 text-sm ${p.pending ? 'bg-amber-50/60' : 'bg-white'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-slate-900">
                {p.refrigerantType}
                {p.pending && <PendingBadge error={p.syncError} />}
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(p.id)}
                  className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-700">
              <CardField label="Date" value={p.date} />
              {showTechnician && <CardField label="Purchased by" value={p.technicianName} />}
              <CardField label="Quantity" value={`${p.quantity} ${p.unit}`} />
              <CardField label="Cost" value={hasValue(p.cost) ? `$${Number(p.cost).toFixed(2)}` : '—'} />
              <CardField label="Supplier" value={p.supplier || '—'} />
              <CardField label="Invoice #" value={p.invoiceNumber || '—'} />
            </dl>
          </div>
        ))}
      </div>

      {/* sm and up: full table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th>Date</Th>
              {showTechnician && <Th>Purchased by</Th>}
              <Th>Refrigerant</Th>
              <Th className="text-right">Quantity</Th>
              <Th className="text-right">Cost</Th>
              <Th>Supplier</Th>
              <Th>Invoice #</Th>
              {onDelete && <Th />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {purchases.map((p) => (
              <tr key={p.id} className={`hover:bg-slate-50 ${p.pending ? 'bg-amber-50/60' : ''}`}>
                <Td className="whitespace-nowrap">
                  {p.date}
                  {p.pending && <PendingBadge error={p.syncError} />}
                </Td>
                {showTechnician && <Td className="whitespace-nowrap">{p.technicianName}</Td>}
                <Td className="whitespace-nowrap">{p.refrigerantType}</Td>
                <Td className="text-right whitespace-nowrap">
                  {p.quantity} {p.unit}
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {hasValue(p.cost) ? `$${Number(p.cost).toFixed(2)}` : '—'}
                </Td>
                <Td className="whitespace-nowrap">{p.supplier || '—'}</Td>
                <Td className="whitespace-nowrap">{p.invoiceNumber || '—'}</Td>
                {onDelete && (
                  <Td>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </Td>
                )}
              </tr>
            ))}
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
