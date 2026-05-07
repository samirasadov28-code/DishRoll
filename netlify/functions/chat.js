const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const LANG_EN = {
  uk:'Ukrainian', fr:'French', es:'Spanish', de:'German',
  pt:'Portuguese', it:'Italian', nl:'Dutch', tr:'Turkish',
  zh:'Chinese', ar:'Arabic', hi:'Hindi', ru:'Russian',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.GROQ_API_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'GROQ_API_KEY is not set. Go to Netlify → Site configuration → Environment variables and add it. Get your key at console.groq.com.',
      }),
    };
  }

  let { prompt, messages, maxTokens = 4000, lang, systemPrompt } = JSON.parse(event.body);

  // Groq has per-model token limits — cap to avoid errors
  if (maxTokens > 4000) maxTokens = 4000;

  const systemContent = systemPrompt ||
    'You are a culinary expert and meal planner. Respond ONLY with valid compact JSON. No markdown backticks, no prose, no preamble, no explanation.';

  // Support multi-turn: accept a messages array, or fall back to single prompt
  const chatHistory = messages ? messages : [{ role: 'user', content: prompt }];

  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemContent },
            ...chatHistory,
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      // Rate limited — wait and retry
      if (response.status === 429) {
        console.warn(`Groq 429 rate limit on attempt ${attempt}, retrying in ${RETRY_DELAY_MS}ms…`);
        lastError = 'Rate limited by Groq';
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }

      if (!response.ok) {
        const errBody = await response.text();
        console.error('Groq API error:', response.status, errBody);
        return {
          statusCode: response.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: `Groq error ${response.status}: ${errBody}` }),
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      };

    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);
      lastError = err.message;
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }

  return {
    statusCode: 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` }),
  };
};
