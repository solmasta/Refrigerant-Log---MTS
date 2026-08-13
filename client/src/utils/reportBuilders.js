import { toCsv, toReadableTable, toTsv } from './textTable.js';

const todayLabel = () => new Date().toLocaleDateString();

function describeFilters(filters, technicians) {
  const parts = [];
  if (filters.technicianId) {
    const tech = technicians.find((t) => t.id === filters.technicianId);
    parts.push(`Technician: ${tech ? `${tech.firstName} ${tech.lastName}` : filters.technicianId}`);
  }
  if (filters.refrigerantType) parts.push(`Refrigerant: ${filters.refrigerantType}`);
  if (filters.dateFrom) parts.push(`From: ${filters.dateFrom}`);
  if (filters.dateTo) parts.push(`To: ${filters.dateTo}`);
  return parts.length ? `Filters: ${parts.join(' · ')}` : 'Filters: none (showing all entries)';
}

const ROSTER_COLUMNS = [
  { key: 'name', label: 'Technician' },
  { key: 'onboarded', label: 'Onboarded' },
  { key: 'logCount', label: 'Logs' },
  { key: 'purchaseCount', label: 'Purchases' },
  { key: 'lastEntry', label: 'Last Entry' },
];

export function buildRosterReport(technicians) {
  const rows = technicians.map((t) => ({
    name: `${t.firstName} ${t.lastName}`,
    onboarded: new Date(t.createdAt).toLocaleDateString(),
    logCount: t.logCount,
    purchaseCount: t.purchaseCount,
    lastEntry: t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : 'No entries yet',
  }));

  const subject = `MTS Refrigerant Log — Technician Roster (${todayLabel()})`;
  const body = [
    'Technician Roster — Refrigerant Log MTS',
    `Generated ${todayLabel()}`,
    '',
    toReadableTable(rows, ROSTER_COLUMNS),
    '',
    `Total technicians: ${technicians.length}`,
  ].join('\n');

  return { subject, body, tsv: toTsv(rows, ROSTER_COLUMNS) };
}

export function buildRosterCsv(technicians) {
  const rows = technicians.map((t) => ({
    name: `${t.firstName} ${t.lastName}`,
    onboarded: new Date(t.createdAt).toLocaleDateString(),
    logCount: t.logCount,
    purchaseCount: t.purchaseCount,
    lastEntry: t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : 'No entries yet',
  }));
  return {
    filename: `technician_roster_${new Date().toISOString().slice(0, 10)}.csv`,
    csv: toCsv(rows, ROSTER_COLUMNS),
  };
}

const LOG_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'technicianName', label: 'Technician' },
  { key: 'equipmentId', label: 'Equipment' },
  { key: 'refrigerantType', label: 'Refrigerant' },
  { key: 'serviceType', label: 'Service' },
  { key: 'amountAdded', label: 'Added' },
  { key: 'amountRecovered', label: 'Recovered' },
];

export function buildLogsReport(logs, filters, technicians) {
  const rows = logs.map((l) => ({
    date: l.date,
    technicianName: l.technicianName,
    equipmentId: l.equipmentId,
    refrigerantType: l.refrigerantType,
    serviceType: l.serviceType,
    amountAdded: l.amountAdded != null ? `${l.amountAdded} ${l.unit}` : '—',
    amountRecovered: l.amountRecovered != null ? `${l.amountRecovered} ${l.unit}` : '—',
  }));

  const totalAdded = logs.reduce((sum, l) => sum + (l.amountAdded || 0), 0);
  const totalRecovered = logs.reduce((sum, l) => sum + (l.amountRecovered || 0), 0);

  const subject = `MTS Refrigerant Usage Log — Export (${todayLabel()})`;
  const body = [
    'Refrigerant Usage Log — MTS',
    `Generated ${todayLabel()}`,
    describeFilters(filters, technicians),
    '',
    toReadableTable(rows, LOG_COLUMNS),
    '',
    `${logs.length} entries · ${totalAdded.toFixed(2)} lbs added · ${totalRecovered.toFixed(2)} lbs recovered`,
  ].join('\n');

  return { subject, body, tsv: toTsv(rows, LOG_COLUMNS) };
}

const PURCHASE_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'technicianName', label: 'Purchased By' },
  { key: 'refrigerantType', label: 'Refrigerant' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'cost', label: 'Cost' },
  { key: 'supplier', label: 'Supplier' },
];

export function buildPurchasesReport(purchases, filters, technicians) {
  const rows = purchases.map((p) => ({
    date: p.date,
    technicianName: p.technicianName,
    refrigerantType: p.refrigerantType,
    quantity: `${p.quantity} ${p.unit}`,
    cost: p.cost != null ? `$${p.cost.toFixed(2)}` : '—',
    supplier: p.supplier || '—',
  }));

  const totalQty = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.cost || 0), 0);

  const subject = `MTS Refrigerant Purchases — Export (${todayLabel()})`;
  const body = [
    'Refrigerant Purchases — MTS',
    `Generated ${todayLabel()}`,
    describeFilters(filters, technicians),
    '',
    toReadableTable(rows, PURCHASE_COLUMNS),
    '',
    `${purchases.length} orders · ${totalQty.toFixed(2)} lbs purchased · $${totalCost.toFixed(2)} spent`,
  ].join('\n');

  return { subject, body, tsv: toTsv(rows, PURCHASE_COLUMNS) };
}
