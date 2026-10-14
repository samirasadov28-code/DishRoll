// Subscription IDs are identifiers, not proof of account ownership.
// Paid account management needs authenticated server entitlement mapping.
// Preserve current free access; never call privileged Stripe cancellation here.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  return {
    statusCode: 403,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancelled: false, error: 'Authenticated billing account required.' }),
  };
};
