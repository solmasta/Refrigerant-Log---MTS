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

// Notes are free text and can run long, so they're kept out of the
// column-aligned table (one long note would force every row's column that
// wide) and listed in full underneath instead, tied back to the entry via
// its heading line.
function notesSection(title, entries, headingFn) {
  const withNotes = entries.filter((e) => e.notes && e.notes.trim());
  if (!withNotes.length) return [];
  return [
    '',
    `${title}:`,
    ...withNotes.flatMap((e) => [`- ${headingFn(e)}`, `  ${e.notes.trim()}`]),
  ];
}

const ROSTER_COLUMNS = [
  { key: 'name', label: 'Technician' },
  { key: 'email', label: 'Email' },
  { key: 'onboarded', label: 'Onboarded' },
  { key: 'logCount', label: 'Logs' },
  { key: 'purchaseCount', label: 'Purchases' },
  { key: 'lastEntry', label: 'Last Entry' },
];

function rosterRows(technicians) {
  return technicians.map((t) => ({
    name: `${t.firstName} ${t.lastName}`,
    email: t.email || '',
    onboarded: new Date(t.createdAt).toLocaleDateString(),
    logCount: t.logCount,
    purchaseCount: t.purchaseCount,
    lastEntry: t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : 'No entries yet',
  }));
}

export function buildRosterReport(technicians) {
  const rows = rosterRows(technicians);

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
  const rows = rosterRows(technicians);
  return {
    filename: `technician_roster_${new Date().toISOString().slice(0, 10)}.csv`,
    csv: toCsv(rows, ROSTER_COLUMNS),
  };
}

// Table columns shown in the aligned email/report view (notes excluded --
// see notesSection). TSV (copy-to-clipboard) gets every field, matching CSV.
const LOG_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'technicianName', label: 'Technician' },
  { key: 'equipmentId', label: 'Equipment' },
  { key: 'location', label: 'Location' },
  { key: 'workOrderNumber', label: 'Work Order #' },
  { key: 'refrigerantType', label: 'Refrigerant' },
  { key: 'serviceType', label: 'Service' },
  { key: 'amountAdded', label: 'Added' },
  { key: 'amountRecovered', label: 'Recovered' },
];
const LOG_TSV_COLUMNS = [...LOG_COLUMNS, { key: 'notes', label: 'Notes' }];

function logRows(logs) {
  return logs.map((l) => ({
    date: l.date,
    technicianName: l.technicianName,
    equipmentId: l.equipmentId,
    location: l.location || '—',
    workOrderNumber: l.workOrderNumber || '—',
    refrigerantType: l.refrigerantType,
    serviceType: l.serviceType,
    amountAdded: l.amountAdded != null ? `${l.amountAdded} ${l.unit}` : '—',
    amountRecovered: l.amountRecovered != null ? `${l.amountRecovered} ${l.unit}` : '—',
    notes: l.notes || '',
  }));
}

function logNotesSection(logs) {
  return notesSection(
    'Notes',
    logs,
    (l) => `${l.date} · ${l.technicianName} · ${l.equipmentId}`
  );
}

export function buildLogsReport(logs, filters, technicians) {
  const rows = logRows(logs);

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
    ...logNotesSection(logs),
  ].join('\n');

  return { subject, body, tsv: toTsv(rows, LOG_TSV_COLUMNS) };
}

const PURCHASE_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'technicianName', label: 'Purchased By' },
  { key: 'refrigerantType', label: 'Refrigerant' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'cost', label: 'Cost' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'invoiceNumber', label: 'Invoice #' },
];
const PURCHASE_TSV_COLUMNS = [...PURCHASE_COLUMNS, { key: 'notes', label: 'Notes' }];

function purchaseRows(purchases) {
  return purchases.map((p) => ({
    date: p.date,
    technicianName: p.technicianName,
    refrigerantType: p.refrigerantType,
    quantity: `${p.quantity} ${p.unit}`,
    cost: p.cost != null ? `$${p.cost.toFixed(2)}` : '—',
    supplier: p.supplier || '—',
    invoiceNumber: p.invoiceNumber || '—',
    notes: p.notes || '',
  }));
}

function purchaseNotesSection(purchases) {
  return notesSection(
    'Notes',
    purchases,
    (p) => `${p.date} · ${p.technicianName} · ${p.refrigerantType}`
  );
}

export function buildPurchasesReport(purchases, filters, technicians) {
  const rows = purchaseRows(purchases);

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
    ...purchaseNotesSection(purchases),
  ].join('\n');

  return { subject, body, tsv: toTsv(rows, PURCHASE_TSV_COLUMNS) };
}

// Raw (unformatted) column sets used for CSV/spreadsheet export, matching
// the backend's /api/export/*.csv column layout exactly.
const LOG_CSV_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'technicianName', label: 'Technician' },
  { key: 'equipmentId', label: 'Equipment ID' },
  { key: 'location', label: 'Location' },
  { key: 'workOrderNumber', label: 'Work Order #' },
  { key: 'refrigerantType', label: 'Refrigerant Type' },
  { key: 'serviceType', label: 'Service Type' },
  { key: 'amountAdded', label: 'Amount Added' },
  { key: 'amountRecovered', label: 'Amount Recovered' },
  { key: 'unit', label: 'Unit' },
  { key: 'notes', label: 'Notes' },
  { key: 'createdAt', label: 'Submitted At' },
];

const PURCHASE_CSV_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'technicianName', label: 'Purchased By' },
  { key: 'refrigerantType', label: 'Refrigerant Type' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unit', label: 'Unit' },
  { key: 'cost', label: 'Cost' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'invoiceNumber', label: 'Invoice #' },
  { key: 'notes', label: 'Notes' },
  { key: 'createdAt', label: 'Submitted At' },
];

export function buildCombinedCsv(technicians, logs, purchases) {
  const csv = [
    '=== TECHNICIAN ROSTER ===',
    toCsv(rosterRows(technicians), ROSTER_COLUMNS),
    '',
    '=== USAGE LOGS ===',
    toCsv(logs, LOG_CSV_COLUMNS),
    '',
    '=== PURCHASES ===',
    toCsv(purchases, PURCHASE_CSV_COLUMNS),
  ].join('\r\n');

  return {
    filename: `refrigerant_log_full_export_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
  };
}

export function buildCombinedReport(technicians, logs, purchases) {
  const logR = logRows(logs);
  const purchaseR = purchaseRows(purchases);
  const techRows = rosterRows(technicians);

  const totalAdded = logs.reduce((sum, l) => sum + (l.amountAdded || 0), 0);
  const totalRecovered = logs.reduce((sum, l) => sum + (l.amountRecovered || 0), 0);
  const totalQty = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.cost || 0), 0);

  const subject = `MTS Refrigerant Log — Full Export (${todayLabel()})`;
  const body = [
    'Refrigerant Log — Full Export — MTS',
    `Generated ${todayLabel()}`,
    '(All technicians, all entries, no filters applied)',
    '',
    '── TECHNICIAN ROSTER ──',
    toReadableTable(techRows, ROSTER_COLUMNS),
    `${technicians.length} technicians`,
    '',
    '── USAGE LOGS ──',
    toReadableTable(logR, LOG_COLUMNS),
    `${logs.length} entries · ${totalAdded.toFixed(2)} lbs added · ${totalRecovered.toFixed(2)} lbs recovered`,
    ...logNotesSection(logs),
    '',
    '── PURCHASES ──',
    toReadableTable(purchaseR, PURCHASE_COLUMNS),
    `${purchases.length} orders · ${totalQty.toFixed(2)} lbs purchased · $${totalCost.toFixed(2)} spent`,
    ...purchaseNotesSection(purchases),
  ].join('\n');

  const tsv = [
    'TECHNICIAN ROSTER',
    toTsv(techRows, ROSTER_COLUMNS),
    '',
    'USAGE LOGS',
    toTsv(logR, LOG_TSV_COLUMNS),
    '',
    'PURCHASES',
    toTsv(purchaseR, PURCHASE_TSV_COLUMNS),
  ].join('\n');

  return { subject, body, tsv };
}
