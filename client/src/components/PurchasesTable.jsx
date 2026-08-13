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
    <div className="overflow-x-auto rounded-xl border border-slate-200">
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
  );
}
