// DishRoll — feedback endpoint
// POST { feedback, email?, meta? } → 200 { ok: true }
//
// Env vars (all optional):
//   FEEDBACK_EMAIL_TO   — your inbox, e.g. you@gmail.com
//   FEEDBACK_RESEND_KEY — API key from resend.com (free tier: 3 000 emails/month)
//   FEEDBACK_EMAIL_FROM — sending address (must be verified in Resend, or omit to
//                         use onboarding@resend.dev which works without any setup)
//   FEEDBACK_WEBHOOK_URL — any webhook (Zapier / Slack / Discord / custom)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  const feedback = (body.feedback || '').toString().trim();
  if (!feedback) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Feedback is empty' }) };
  }
  if (feedback.length > 4000) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Feedback too long (max 4000 chars)' }) };
  }

  const email = (body.email || '').toString().trim().slice(0, 200);
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
  const record = {
    ts: new Date().toISOString(),
    feedback,
    email: email || null,
    version: meta.version || null,
    path: meta.path || null,
    ua: (event.headers && (event.headers['user-agent'] || event.headers['User-Agent'])) || null,
  };

  // Always log to Netlify function logs (visible in dashboard)
  console.log('[dishroll-feedback]', JSON.stringify(record));

  const { FEEDBACK_RESEND_KEY, FEEDBACK_EMAIL_FROM, FEEDBACK_WEBHOOK_URL } = process.env;
  const FEEDBACK_EMAIL_TO = process.env.FEEDBACK_EMAIL_TO || 'finmodelup@gmail.com';

  // Email notification via Resend (resend.com — free tier covers 3 000 emails/month)
  // FEEDBACK_EMAIL_FROM defaults to onboarding@resend.dev, which works without domain
  // verification. Once you verify dishroll.app in Resend, set FEEDBACK_EMAIL_FROM to
  // e.g. "DishRoll <feedback@dishroll.app>" for a branded sender.
  if (FEEDBACK_RESEND_KEY) {
    try {
      const fromAddress = FEEDBACK_EMAIL_FROM || 'DishRoll Feedback <onboarding@resend.dev>';
      const fromUser = email || 'anonymous';
      const subject = `DishRoll feedback from ${fromUser}`;
      const text = [
        `From: ${email || 'anonymous'}`,
        `Version: ${record.version || '?'}`,
        `Time: ${record.ts}`,
        '',
        feedback,
        '',
        `---`,
        `Path: ${record.path || '/'}`,
        `UA: ${record.ua || '?'}`,
      ].join('\n');

      const emailPayload = {
        from: fromAddress,
        to: [FEEDBACK_EMAIL_TO],
        subject,
        text,
      };
      if (email) emailPayload.reply_to = email;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FEEDBACK_RESEND_KEY}`,
        },
        body: JSON.stringify(emailPayload),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn('[dishroll-feedback] Resend error', res.status, errBody);
      } else {
        console.log('[dishroll-feedback] email sent to', FEEDBACK_EMAIL_TO);
      }
    } catch (err) {
      console.warn('[dishroll-feedback] email failed:', err.message);
    }
  }

  // Optional: forward to any webhook (Zapier / Slack / Discord / custom)
  if (FEEDBACK_WEBHOOK_URL) {
    try {
      await fetch(FEEDBACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `📝 DishRoll feedback from ${email || 'anon'} (v${record.version || '?'}):\n${feedback}`,
          record,
        }),
      });
    } catch (err) {
      console.warn('[dishroll-feedback] webhook failed:', err.message);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
