const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Groq's OpenAI-compatible chat completions endpoint, automatically
 * retrying on 429 (rate limited) and 503 (overloaded) with exponential
 * backoff + jitter. Returns the raw fetch Response on success or on a
 * non-retryable error, so callers keep their existing response-handling
 * logic largely unchanged.
 *
 * @param {string} apiKey
 * @param {object} body - { messages, response_format, temperature, max_tokens, ... }
 * @param {{ model?: string, retries?: number, baseDelayMs?: number }} [options]
 */
async function fetchGroqWithRetry(apiKey, body, options = {}) {
  const { model = "llama-3.3-70b-versatile", retries = 3, baseDelayMs = 1000 } = options;

  let lastResponse;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, ...body }),
    });

    if (response.ok || (response.status !== 429 && response.status !== 503)) {
      return response;
    }

    lastResponse = response;

    if (attempt < retries) {
      const jitter = Math.random() * 250;
      const delay = baseDelayMs * 2 ** attempt + jitter;
      await sleep(delay);
    }
  }

  return lastResponse;
}

export { fetchGroqWithRetry };
