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

// Renders each row as a short, self-labeled block ("1. ...", indented
// follow-up lines) instead of a padded/aligned table. Plain-text emails are
// almost always shown in a proportional font (Gmail, Apple Mail, Outlook all
// do this), so a table built with space-padding lines up only in a
// monospace font -- in the actual email it reads as ragged, misaligned
// columns. Self-labeled lines stay readable regardless of font, and wrap
// gracefully on a phone-width screen instead of forcing a wide table to
// reflow mid-row.
//
// `lineBuilders` is an array of `(row) => string | null` functions, one per
// line of the block; a builder returning null/empty skips that line for
// that row (e.g. an optional "Notes:" line).
export function toEntryList(rows, lineBuilders) {
  if (!rows.length) return '(no entries)';
  return rows
    .map((row, i) => {
      const lines = lineBuilders
        .map((build) => build(row))
        .filter((line) => line !== null && line !== undefined && line !== '');
      return lines.map((line, j) => (j === 0 ? `${i + 1}. ${line}` : `   ${line}`)).join('\n');
    })
    .join('\n\n');
}
