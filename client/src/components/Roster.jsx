export default function Roster({ technicians }) {
  if (!technicians.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        No technicians have signed in yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Technician
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {technicians.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-3 py-2 font-medium text-slate-900">
                {t.firstName} {t.lastName}
              </td>
              <td className="px-3 py-2 text-slate-500">
                {new Date(t.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 text-right text-slate-700">{t.logCount}</td>
              <td className="px-3 py-2 text-right text-slate-700">{t.purchaseCount}</td>
              <td className="px-3 py-2 text-slate-500">
                {t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
