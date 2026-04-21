// DishRoll — feedback endpoint
// POST { feedback, email?, meta? } → 200 { ok: true }
// Logs to Netlify function logs; if FEEDBACK_WEBHOOK_URL env var is set, also POSTs there
// (compatible with Zapier, Slack webhooks, Discord webhooks, custom endpoints).

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

  // Optional: forward to any webhook (Zapier / Slack / Discord / custom)
  const { FEEDBACK_WEBHOOK_URL } = process.env;
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
