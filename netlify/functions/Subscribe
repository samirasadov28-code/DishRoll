// DishRoll — create Stripe Checkout session
// Env vars required: STRIPE_SECRET_KEY, STRIPE_PRICE_ID
// Set these in Netlify dashboard → Site settings → Environment variables

const ORIGIN = process.env.URL || 'https://your-dishroll-site.netlify.app';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;
  if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID to Netlify env vars.' })
    };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  try {
    // Create a Stripe Checkout session via the REST API (no SDK needed)
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'line_items[0][price]': STRIPE_PRICE_ID,
        'line_items[0][quantity]': '1',
        'success_url': `${ORIGIN}/?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${ORIGIN}/`,
        'allow_promotion_codes': 'true',
        // Pre-fill email if we have it
        ...(body.email ? { 'customer_email': body.email } : {}),
      }).toString(),
    });

    const session = await res.json();

    if (session.error) {
      return { statusCode: 400, body: JSON.stringify({ error: session.error.message }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
