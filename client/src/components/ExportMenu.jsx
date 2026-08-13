import { useEffect, useRef, useState } from 'react';
import EmailTemplateModal from './EmailTemplateModal.jsx';
import { copyText } from '../utils/clipboard.js';
import { downloadTextFile } from '../utils/download.js';

export default function ExportMenu({ csvHref, buildCsv, buildReport, label = 'Export' }) {
  const [open, setOpen] = useState(false);
  const [emailReport, setEmailReport] = useState(null);
  const [toast, setToast] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleCopy() {
    setOpen(false);
    const { tsv } = await buildReport();
    const ok = await copyText(tsv);
    setToast(ok ? 'Copied — paste into Excel, Sheets, or an email' : 'Could not copy automatically');
    setTimeout(() => setToast(''), 3000);
  }

  async function handleEmail() {
    setOpen(false);
    const report = await buildReport();
    setEmailReport(report);
  }

  async function handleCsvDownload() {
    setOpen(false);
    const { filename, csv } = await buildCsv();
    downloadTextFile(filename, csv);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        {label}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {csvHref ? (
            <a
              href={csvHref}
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-medium">Download CSV</span>
              <span className="block text-xs text-slate-500">Spreadsheet file (Excel, Sheets)</span>
            </a>
          ) : (
            <button
              onClick={handleCsvDownload}
              className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-medium">Download CSV</span>
              <span className="block text-xs text-slate-500">Spreadsheet file (Excel, Sheets)</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="font-medium">Copy to clipboard</span>
            <span className="block text-xs text-slate-500">Paste into a spreadsheet or email</span>
          </button>
          <button
            onClick={handleEmail}
            className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="font-medium">Email template</span>
            <span className="block text-xs text-slate-500">Pre-filled subject and body</span>
          </button>
        </div>
      )}

      {toast && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}

      {emailReport && (
        <EmailTemplateModal
          subject={emailReport.subject}
          body={emailReport.body}
          onClose={() => setEmailReport(null)}
        />
      )}
    </div>
  );
}
