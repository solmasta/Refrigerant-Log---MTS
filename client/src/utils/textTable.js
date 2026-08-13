function pad(value, width) {
  const str = String(value ?? '—');
  if (str.length >= width) return str.slice(0, Math.max(width - 1, 1)) + '…';
  return str + ' '.repeat(width - str.length);
}

export function toTsv(rows, columns) {
  const header = columns.map((c) => c.label).join('\t');
  const lines = rows.map((row) =>
    columns.map((c) => String(row[c.key] ?? '')).join('\t')
  );
  return [header, ...lines].join('\n');
}

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(','));
  return [header, ...lines].join('\r\n');
}

export function toReadableTable(rows, columns) {
  if (!rows.length) return '(no entries)';
  const widths = columns.map((c) =>
    Math.min(40, Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? '').length)) + 2)
  );
  const header = columns.map((c, i) => pad(c.label, widths[i])).join('');
  const divider = widths.map((w) => '-'.repeat(w - 1)).join(' ');
  const lines = rows.map((r) => columns.map((c, i) => pad(r[c.key], widths[i])).join(''));
  return [header, divider, ...lines].join('\n');
}
