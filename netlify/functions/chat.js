// DishRoll — AI chat/generation endpoint
// Tries llama-3.3-70b-versatile first, falls back to llama-3.1-8b-instant on 429/5xx.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const LANG_EN = {
  uk:'Ukrainian', fr:'French', es:'Spanish', de:'German',
  pt:'Portuguese', it:'Italian', nl:'Dutch', tr:'Turkish',
  zh:'Chinese', ar:'Arabic', hi:'Hindi', ru:'Russian',
  bn:'Bengali', ja:'Japanese', id:'Indonesian',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!process.env.GROQ_API_KEY) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'GROQ_API_KEY is not set. Go to Netlify → Site configuration → Environment variables and add it. Get your key at console.groq.com.',
      }),
    };
  }

  let { prompt, messages, maxTokens = 4000, lang, systemPrompt } = JSON.parse(event.body);
  if (maxTokens > 4000) maxTokens = 4000;

  const systemContent = systemPrompt ||
    'You are a culinary expert and meal planner. Respond ONLY with valid compact JSON. No markdown backticks, no prose, no preamble, no explanation.';

  const chatHistory = messages ? messages : [{ role: 'user', content: prompt }];

  let lastError = '';

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemContent }, ...chatHistory],
            max_tokens: maxTokens,
            temperature: 0.7,
          }),
        });

        if (response.status === 429 || response.status >= 500) {
          const errBody = await response.text().catch(() => '');
          lastError = `Groq ${response.status} (${model})${errBody ? ': ' + errBody.slice(0, 200) : ''}`;
          console.warn(`[chat] ${lastError}, attempt ${attempt}/${MAX_RETRIES}`);
          if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
          continue; // retry same model, then outer loop tries next model
        }

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          console.error('[chat] Groq error:', response.status, errBody);
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: `Groq error ${response.status}${errBody ? ': ' + errBody.slice(0, 300) : ''}` }),
          };
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        console.log(`[chat] ok model=${model} attempt=${attempt}`);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        };

      } catch (err) {
        console.error(`[chat] attempt ${attempt} model=${model} failed:`, err.message);
        lastError = err.message;
        if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS);
      }
    }
    // All retries for this model exhausted — try next model
    console.warn(`[chat] model ${model} exhausted, trying next…`);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: `AI service unavailable — please try again in a moment. (${lastError})` }),
  };
};
