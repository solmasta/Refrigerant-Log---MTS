import { toCsv, toEntryList, toTsv } from './textTable.js';

const todayLabel = () => new Date().toLocaleDateString();

// Formats an ISO date ("2026-08-13" or "2026-08-13T00:00:00Z") as "08/13/26"
// by slicing the string directly rather than going through `new Date(...)`,
// which can shift a date-only value to the previous day depending on the
// reader's timezone.
function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return iso || '—';
  const [, y, mo, d] = m;
  return `${mo}/${d}/${y.slice(2)}`;
}

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

// Each report body renders one short, label:value block per row (see
// toEntryList) instead of a padded/aligned table, so it stays readable in
// plain-text email clients -- which almost always show plain text in a
// proportional font, not monospace -- and wraps cleanly on a phone screen.
// Two related fields share a line via " | "; a field that can run long
// (location, notes) gets its own line instead of being crammed in.
function rosterEntryList(technicians) {
  return toEntryList(technicians, [
    (t) => `${t.firstName} ${t.lastName}${t.email ? ` <${t.email}>` : ''}`,
    (t) => `Onboarded: ${shortDate(t.createdAt)} | Logs: ${t.logCount} | Purchases: ${t.purchaseCount}`,
    (t) => `Last entry: ${t.lastEntryAt ? new Date(t.lastEntryAt).toLocaleString() : 'No entries yet'}`,
  ]);
}

export function buildRosterReport(technicians) {
  const rows = rosterRows(technicians);

  const subject = `MTS Refrigerant Log — Technician Roster (${todayLabel()})`;
  const body = [
    'Technician Roster — Refrigerant Log MTS',
    `Generated ${todayLabel()}`,
    '',
    rosterEntryList(technicians),
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

// TSV (copy-to-clipboard/paste-into-spreadsheet) columns get every field,
// matching CSV.
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

function addedRecovered(l) {
  const unit = l.unit || 'lbs';
  const added = l.amountAdded != null ? l.amountAdded : 0;
  const recovered = l.amountRecovered != null ? l.amountRecovered : 0;
  return `+${added} ${unit} / ${recovered} ${unit}`;
}

function logEntryList(logs) {
  return toEntryList(logs, [
    (l) => `USAGE (${shortDate(l.date)})${l.workOrderNumber ? ` — WO#${l.workOrderNumber}` : ''}`,
    (l) => `Tech: ${l.technicianName} | Unit: ${l.equipmentId}`,
    (l) => `Loc: ${l.location || '—'} | Ref: ${l.refrigerantType}`,
    (l) => `Type: ${l.serviceType} | ${addedRecovered(l)}`,
    (l) => (l.notes && l.notes.trim() ? `Notes: ${l.notes.trim()}` : null),
  ]);
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
    logEntryList(logs),
    '',
    `${logs.length} entries · ${totalAdded.toFixed(2)} lbs added · ${totalRecovered.toFixed(2)} lbs recovered`,
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

function purchaseEntryList(purchases) {
  return toEntryList(purchases, [
    (p) => `PURCHASE (${shortDate(p.date)})`,
    (p) => `Tech: ${p.technicianName} | Ref: ${p.refrigerantType}`,
    (p) => `Qty: ${p.quantity} ${p.unit} | Cost: ${p.cost != null ? `$${p.cost.toFixed(2)}` : '—'}`,
    (p) => (p.supplier ? `Supplier: ${p.supplier}` : null),
    (p) => (p.invoiceNumber ? `Inv: ${p.invoiceNumber}` : null),
    (p) => (p.notes && p.notes.trim() ? `Notes: ${p.notes.trim()}` : null),
  ]);
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
    purchaseEntryList(purchases),
    '',
    `${purchases.length} orders · ${totalQty.toFixed(2)} lbs purchased · $${totalCost.toFixed(2)} spent`,
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
    rosterEntryList(technicians),
    `${technicians.length} technicians`,
    '',
    '── USAGE LOGS ──',
    logEntryList(logs),
    `${logs.length} entries · ${totalAdded.toFixed(2)} lbs added · ${totalRecovered.toFixed(2)} lbs recovered`,
    '',
    '── PURCHASES ──',
    purchaseEntryList(purchases),
    `${purchases.length} orders · ${totalQty.toFixed(2)} lbs purchased · $${totalCost.toFixed(2)} spent`,
  ].join('\n');

  const tsv = [
    'TECHNICIAN ROSTER',
    toTsv(rosterRows(technicians), ROSTER_COLUMNS),
    '',
    'USAGE LOGS',
    toTsv(logRows(logs), LOG_TSV_COLUMNS),
    '',
    'PURCHASES',
    toTsv(purchaseRows(purchases), PURCHASE_TSV_COLUMNS),
  ].join('\n');

  return { subject, body, tsv };
}
