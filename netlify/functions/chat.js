exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Guard: API key must be set in Netlify environment variables
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'ANTHROPIC_API_KEY is not set. Go to Netlify → Site configuration → Environment variables and add it.',
      }),
    };
  }

  try {
    const { prompt, maxTokens = 4000 } = JSON.parse(event.body);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929', // Claude Sonnet 4.5 — confirmed valid
        max_tokens: maxTokens,
        system:
          'You are a culinary expert and meal planner. Respond ONLY with valid compact JSON. No markdown backticks, no prose, no preamble.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    // Surface the real Anthropic error message back to the client
    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Anthropic error ${response.status}: ${errBody}` }),
      };
    }

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || '').join('');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
