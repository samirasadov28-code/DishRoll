// DishRoll — cancel Stripe subscription at period end (no refund)
// Called with { subscriptionId: 'sub_xxx' } → returns { cancelled, accessUntil }
// Env vars required: STRIPE_SECRET_KEY

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const { STRIPE_SECRET_KEY } = process.env;
  if (!STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe not configured.' }),
    };
  }

  let subscriptionId;
  try {
    subscriptionId = JSON.parse(event.body || '{}').subscriptionId;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) };
  }

  if (!subscriptionId || !subscriptionId.startsWith('sub_')) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid subscription ID' }) };
  }

  try {
    // Stripe: set cancel_at_period_end=true → no refund, access until period end,
    // then auto-cancels with no further charges.
    const res = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ cancel_at_period_end: 'true' }).toString(),
      }
    );

    const sub = await res.json();

    if (sub.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: sub.error.message }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cancelled: true,
        cancelAtPeriodEnd: sub.cancel_at_period_end === true,
        accessUntil: sub.current_period_end
          ? sub.current_period_end * 1000
          : null,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
