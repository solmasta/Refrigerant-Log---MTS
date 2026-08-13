import { useState } from 'react';
import Modal from './Modal.jsx';
import { copyText } from '../utils/clipboard.js';
import { api } from '../api.js';

const MAILTO_SAFE_LENGTH = 1800;

export default function EmailTemplateModal({ subject, body, onClose }) {
  const [to, setTo] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState('');

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

  async function handleSend() {
    setSending(true);
    setSendError('');
    setSendResult(null);
    try {
      const res = await api.sendExportEmail(to, subject, body);
      setSendResult(res);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal title="Email template" onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            To <span className="font-normal text-slate-400">(required to send directly; comma-separate for multiple)</span>
          </span>
          <input
            type="email"
            multiple
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setSendResult(null);
              setSendError('');
            }}
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleSend}
            disabled={sending || !to.trim()}
            className="flex-1 rounded-lg bg-sky-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send email now'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
        {sendResult && (
          <p className="text-sm text-emerald-600">Sent to {sendResult.sentTo.join(', ')}.</p>
        )}
        {sendError && <p className="text-sm text-red-600">{sendError}</p>}

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">
            Or open it in your own email app instead — note that long reports like this one get
            silently cut off by most email clients when opened this way, so copy the text above
            and paste it in manually if you go this route.
            {tooLongForMailto && ' This report is long enough that truncation is likely.'}
          </p>
          <a
            href={mailtoHref}
            className="inline-block text-sm font-medium text-slate-600 underline hover:text-slate-800"
          >
            Open in email app instead
          </a>
        </div>
      </div>
    </Modal>
  );
}
