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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendMonthlyReminders(env, technicians) {
  const recipients = technicians.filter((t) => t.email && t.email.trim());

  const results = await Promise.allSettled(
    recipients.map(async (t) => {
      const { subject, text, html } = buildReminderEmail(t, env.APP_URL);
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
