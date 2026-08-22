function hasValue(v) {
  return v !== null && v !== undefined && v !== '';
}

function PendingBadge({ error }) {
  if (error) {
    return (
      <span
        title={error}
        className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
      >
        Sync issue
      </span>
    );
  }
  return (
    <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      Pending sync
    </span>
  );
}

export default function LogsTable({ logs, showTechnician = false, onEdit, onDelete }) {
  if (!logs.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No log entries yet.
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards, no horizontal scrolling */}
      <div className="space-y-3 sm:hidden">
        {logs.map((log) => (
          <div
            key={log.id}
            className={`rounded-xl border border-slate-200 p-4 text-sm ${log.pending ? 'bg-amber-50/60' : 'bg-white'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">
                  {log.equipmentId}
                  {log.pending && <PendingBadge error={log.syncError} />}
                </div>
                {log.location && <div className="text-xs text-slate-500">{log.location}</div>}
              </div>
              {!log.pending && (onEdit || onDelete) && (
                <div className="flex shrink-0 gap-3">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(log)}
                      className="text-xs font-medium text-sky-600 hover:text-sky-700"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(log.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-slate-700">
              <CardField label="Date" value={log.date} />
              {showTechnician && <CardField label="Technician" value={log.technicianName} />}
              <CardField label="Refrigerant" value={log.refrigerantType} />
              <CardField label="Service" value={log.serviceType} />
              <CardField
                label="Added"
                value={hasValue(log.amountAdded) ? `${log.amountAdded} ${log.unit}` : '—'}
              />
              <CardField
                label="Recovered"
                value={hasValue(log.amountRecovered) ? `${log.amountRecovered} ${log.unit}` : '—'}
              />
              {log.workOrderNumber && <CardField label="Work order" value={log.workOrderNumber} />}
            </dl>
            {log.notes && (
              <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                {log.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* sm and up: full table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <Th>Date</Th>
              {showTechnician && <Th>Technician</Th>}
              <Th>Equipment</Th>
              <Th>Refrigerant</Th>
              <Th>Service</Th>
              <Th className="text-right">Added</Th>
              <Th className="text-right">Recovered</Th>
              <Th>Notes</Th>
              {(onEdit || onDelete) && <Th />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {logs.map((log) => (
              <tr key={log.id} className={`hover:bg-slate-50 ${log.pending ? 'bg-amber-50/60' : ''}`}>
                <Td className="whitespace-nowrap">
                  {log.date}
                  {log.pending && <PendingBadge error={log.syncError} />}
                </Td>
                {showTechnician && <Td className="whitespace-nowrap">{log.technicianName}</Td>}
                <Td>
                  <div className="font-medium text-slate-900">{log.equipmentId}</div>
                  {log.location && <div className="text-xs text-slate-500">{log.location}</div>}
                  {log.workOrderNumber && (
                    <div className="text-xs text-slate-500">WO# {log.workOrderNumber}</div>
                  )}
                </Td>
                <Td className="whitespace-nowrap">{log.refrigerantType}</Td>
                <Td className="whitespace-nowrap">{log.serviceType}</Td>
                <Td className="text-right whitespace-nowrap">
                  {hasValue(log.amountAdded) ? `${log.amountAdded} ${log.unit}` : '—'}
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {hasValue(log.amountRecovered) ? `${log.amountRecovered} ${log.unit}` : '—'}
                </Td>
                <Td className="max-w-xs text-slate-500">
                  <span className="line-clamp-2 whitespace-normal">{log.notes || '—'}</span>
                </Td>
                {(onEdit || onDelete) && (
                  <Td className="whitespace-nowrap">
                    {!log.pending && (
                      <>
                        {onEdit && (
                          <button
                            onClick={() => onEdit(log)}
                            className="text-xs font-medium text-sky-600 hover:text-sky-700"
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(log.id)}
                            className="ml-3 text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
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

function Th({ children, className = '' }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '' }) {
  return <td className={`px-3 py-2 text-slate-700 ${className}`}>{children}</td>;
}

export { Th, Td, PendingBadge, hasValue };
