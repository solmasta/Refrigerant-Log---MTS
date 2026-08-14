import { useState } from 'react';
import Modal from './Modal.jsx';
import { copyText } from '../utils/clipboard.js';

const MAILTO_SAFE_LENGTH = 1800;

// navigator.share() hands data straight to the OS share sheet (Mail, Gmail,
// etc.) with no URL involved, so it isn't limited by a mailto: link's
// browser-enforced length cap — that's what makes long, full reports arrive
// complete instead of getting cut off.
const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export default function EmailTemplateModal({ subject, body, getCsvFile, onClose }) {
  const [to, setTo] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');

  const mailtoHref = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  const tooLongForMailto = mailtoHref.length > MAILTO_SAFE_LENGTH;

  async function handleCopy(field, text) {
    const ok = await copyText(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 2000);
    }
  }

  // Text inlined into a share call isn't unlimited in practice -- some
  // share targets choke on very long reports (lots of technicians/entries/
  // notes). Attaching the export as a real CSV file sidesteps that
  // entirely, so try progressively simpler combinations until one works,
  // rather than failing outright the moment the richest option doesn't.
  async function handleShare() {
    setShareError('');
    setSharing(true);
    try {
      let file = null;
      if (getCsvFile) {
        try {
          file = await getCsvFile();
        } catch {
          file = null;
        }
      }

      const attempts = [];
      if (file && navigator.canShare?.({ files: [file] })) {
        attempts.push({ title: subject, text: body, files: [file] });
        attempts.push({ title: subject, files: [file] });
      }
      attempts.push({ title: subject, text: body });

      let lastError;
      for (const data of attempts) {
        try {
          await navigator.share(data);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return; // user closed the share sheet themselves
          lastError = err;
        }
      }
      throw lastError;
    } catch {
      setShareError(
        'Could not open the share sheet. Use Copy above and paste into a new email instead, or use Download CSV from the export menu.'
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal title="Email template" onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">To (optional)</span>
          <input
            type="email"
            multiple
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="supervisor@company.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Subject</span>
            <button
              onClick={() => handleCopy('subject', subject)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              {copiedField === 'subject' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <input
            readOnly
            value={subject}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Body</span>
            <button
              onClick={() => handleCopy('body', body)}
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              {copiedField === 'body' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            value={body}
            rows={12}
            className="w-full whitespace-pre rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
          />
        </div>

        {tooLongForMailto && (
          <p className="text-xs text-amber-600">
            This report is long, so "Open in email app" below may cut off the body.
            {canWebShare
              ? ' Use Share below instead — it attaches the full report as a CSV file — or copy the text above and paste it into a new email.'
              : ' Copy the text above and paste it into a new email to be safe, or use Download CSV from the export menu instead.'}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={mailtoHref}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Open in email app
          </a>
          {canWebShare && (
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 rounded-lg border border-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-sky-600 transition hover:bg-sky-50 disabled:opacity-60"
            >
              {sharing ? 'Opening…' : 'Share…'}
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        {shareError && <p className="text-sm text-red-600">{shareError}</p>}
        {canWebShare && (
          <p className="text-xs text-slate-500">
            "Open in email app" launches Mail/Gmail directly. "Share…" opens your device's share
            sheet, which can attach the CSV file or send via another app.
          </p>
        )}
      </div>
    </Modal>
  );
}
