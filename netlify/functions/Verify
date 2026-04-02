// DishRoll — verify Stripe Checkout session after payment
// Called with { sessionId: 'cs_xxx' } → returns { premium, email, customerId, validUntil }
// Env vars required: STRIPE_SECRET_KEY

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe not configured.' })
    };
  }

  let sessionId;
  try {
    sessionId = JSON.parse(event.body || '{}').sessionId;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  if (!sessionId || !sessionId.startsWith('cs_')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid session ID' }) };
  }

  try {
    // Retrieve the checkout session from Stripe, expanding subscription
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=subscription`,
      {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
      }
    );

    const session = await res.json();

    if (session.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ premium: false, error: session.error.message }),
      };
    }

    // Session must be 'complete' with an active subscription
    const isPaid = session.payment_status === 'paid' || session.status === 'complete';
    const sub = session.subscription;
    const isActive = sub?.status === 'active' || sub?.status === 'trialing';

    if (!isPaid && !isActive) {
      return {
        statusCode: 200,
        body: JSON.stringify({ premium: false, reason: 'Payment not complete' }),
      };
    }

    // Work out validUntil from subscription period end
    // Falls back to 31 days from now if subscription not expanded
    const periodEnd = sub?.current_period_end
      ? sub.current_period_end * 1000          // Stripe returns Unix seconds
      : Date.now() + 31 * 24 * 60 * 60 * 1000;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        premium: true,
        email: session.customer_details?.email || session.customer_email || '',
        customerId: session.customer || '',
        subscriptionId: typeof sub === 'object' ? sub.id : sub,
        validUntil: periodEnd,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ premium: false, error: err.message }),
    };
  }
};
