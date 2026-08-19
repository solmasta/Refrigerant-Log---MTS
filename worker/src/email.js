const DEFAULT_FROM = 'Refrigerant Log MTS <onboarding@resend.dev>';

export async function sendEmail(env, { to, subject, html, text }) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || DEFAULT_FROM,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${body.slice(0, 300)}`);
  }
}

export function buildReminderEmail(technician, appUrl) {
  const loginUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/technician/login` : null;
  const now = new Date();
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  // Day 0 of next month rolls back to the last day of the current month.
  const deadlineLabel = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const subject = `Reminder: refrigerant logs due by ${deadlineLabel}`;

  const text = [
    `Hi ${technician.firstName},`,
    '',
    `This is a monthly reminder that your refrigerant usage and purchase entries for ${monthLabel} must be submitted by the end of the month — ${deadlineLabel}.`,
    '',
    loginUrl ? `Log in here: ${loginUrl}` : null,
    '',
    '— Refrigerant Log MTS',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <p>Hi ${escapeHtml(technician.firstName)},</p>
    <p>This is a monthly reminder that your refrigerant usage and purchase entries for ${escapeHtml(monthLabel)} must be submitted by the end of the month — <strong>${escapeHtml(deadlineLabel)}</strong>.</p>
    ${loginUrl ? `<p><a href="${escapeHtml(loginUrl)}">Log in to Refrigerant Log MTS</a></p>` : ''}
    <p>— Refrigerant Log MTS</p>
  `.trim();

  return { subject, text, html };
}

// A second-round nudge for technicians who are on the roster but haven't
// gotten into the habit yet -- a plain-language recap of what the app is
// and how to use it, rather than the deadline-driven monthly notice.
export function buildWelcomeReminderEmail(technician, appUrl) {
  const loginUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/technician/login` : null;

  const subject = `Friendly reminder: how we're using Refrigerant Log MTS`;

  const text = [
    `Hi ${technician.firstName},`,
    '',
    `Just a friendly reminder about Refrigerant Log MTS, the app we're using to track refrigerant usage and purchases.`,
    '',
    `Here's how it works:`,
    `- Log in with just your first and last name -- no password needed.`,
    `- After every job, log the refrigerant type, amount added/recovered, and equipment info.`,
    `- Log any refrigerant purchases too, so we keep accurate records.`,
    '',
    `It only takes a minute per entry, and it keeps us organized and compliant.`,
    '',
    loginUrl ? `Log in here: ${loginUrl}` : null,
    '',
    `Thanks for staying on top of this -- let me know if you have any questions.`,
    '',
    '— Refrigerant Log MTS',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <p>Hi ${escapeHtml(technician.firstName)},</p>
    <p>Just a friendly reminder about Refrigerant Log MTS, the app we're using to track refrigerant usage and purchases.</p>
    <p>Here's how it works:</p>
    <ul>
      <li>Log in with just your first and last name — no password needed.</li>
      <li>After every job, log the refrigerant type, amount added/recovered, and equipment info.</li>
      <li>Log any refrigerant purchases too, so we keep accurate records.</li>
    </ul>
    <p>It only takes a minute per entry, and it keeps us organized and compliant.</p>
    ${loginUrl ? `<p><a href="${escapeHtml(loginUrl)}">Log in to Refrigerant Log MTS</a></p>` : ''}
    <p>Thanks for staying on top of this — let me know if you have any questions.</p>
    <p>— Refrigerant Log MTS</p>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const REMINDER_TEMPLATES = {
  monthly: { label: 'Monthly deadline reminder', build: buildReminderEmail },
  welcome: { label: 'Friendly reminder (how to use the app)', build: buildWelcomeReminderEmail },
};

export async function sendReminderEmails(env, technicians, templateId = 'monthly') {
  const { build } = REMINDER_TEMPLATES[templateId] || REMINDER_TEMPLATES.monthly;
  const recipients = technicians.filter((t) => t.email && t.email.trim());

  const results = await Promise.allSettled(
    recipients.map(async (t) => {
      const { subject, text, html } = build(t, env.APP_URL);
      await sendEmail(env, { to: t.email, subject, text, html });
      return t.email;
    })
  );

  const sent = [];
  const failed = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') sent.push(r.value);
    else failed.push({ email: recipients[i].email, error: r.reason?.message || 'Unknown error' });
  });

  return {
    totalTechnicians: technicians.length,
    skippedNoEmail: technicians.length - recipients.length,
    sent,
    failed,
  };
}
