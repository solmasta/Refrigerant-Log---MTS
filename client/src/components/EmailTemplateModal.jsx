import { useState } from 'react';
import Modal from './Modal.jsx';
import { copyText } from '../utils/clipboard.js';

const MAILTO_SAFE_LENGTH = 1800;

export default function EmailTemplateModal({ subject, body, onClose }) {
  const [to, setTo] = useState('');
  const [copiedField, setCopiedField] = useState(null);

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
            This report is long, so some email apps may cut off the body when opened directly.
            Copy the text above and paste it into a new email to be safe.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={mailtoHref}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
          >
            Open in email app
          </a>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
