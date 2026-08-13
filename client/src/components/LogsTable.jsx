export default function LogsTable({ logs, showTechnician = false, onDelete }) {
  if (!logs.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No log entries yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
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
            {onDelete && <Th />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50">
              <Td className="whitespace-nowrap">{log.date}</Td>
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
                {log.amountAdded != null ? `${log.amountAdded} ${log.unit}` : '—'}
              </Td>
              <Td className="text-right whitespace-nowrap">
                {log.amountRecovered != null ? `${log.amountRecovered} ${log.unit}` : '—'}
              </Td>
              <Td className="max-w-xs text-slate-500">
                <span className="line-clamp-2 whitespace-normal">{log.notes || '—'}</span>
              </Td>
              {onDelete && (
                <Td>
                  <button
                    onClick={() => onDelete(log.id)}
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

export { Th, Td };
