const GEMINI_URL = (model, apiKey) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini's generateContent endpoint, automatically retrying on 429
 * (rate limited) and 503 (overloaded) with exponential backoff + jitter.
 * Returns the raw fetch Response on success or on a non-retryable error,
 * so callers keep their existing response-handling logic unchanged.
 *
 * @param {string} apiKey
 * @param {object} body - request body (contents, generationConfig, etc.)
 * @param {{ model?: string, retries?: number, baseDelayMs?: number }} [options]
 */
async function fetchGeminiWithRetry(apiKey, body, options = {}) {
  const { model = "gemini-2.5-flash", retries = 3, baseDelayMs = 1000 } = options;

  let lastResponse;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(GEMINI_URL(model, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

export { fetchGeminiWithRetry };
