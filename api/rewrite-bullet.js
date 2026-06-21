import { getClientIp, checkAndIncrementRateLimit } from "./_lib/rateLimit.js";
import { fetchGroqWithRetry } from "./_lib/groqFetch.js";

// Pick one weak bullet from the resume and rewrite it, tailored to the job
// description. Cheap, single-bullet output, so a generous per-IP ceiling.
const DAILY_IP_LIMIT = 120;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: "Resume and job description are required." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured." });
  }

  try {
    const ip = getClientIp(req);
    const { allowed } = await checkAndIncrementRateLimit(ip, {
      collection: "bulletRewriteRateLimits",
      limit: DAILY_IP_LIMIT,
    });

    if (!allowed) {
      return res.status(429).json({ error: "Too many requests. Try again tomorrow." });
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  const prompt = `
You are an expert resume writer. Find the SINGLE weakest bullet point in this resume — vague, no metrics, passive language, or low relevance to the job description — and rewrite just that one bullet to be strong, quantified, and tailored to the job description. Return structured JSON only — no markdown, no explanation, just raw JSON.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return this exact JSON structure:
{
  "originalBullet": "<the exact weak bullet copied from the resume, unmodified>",
  "rewrittenBullet": "<your improved rewrite of that one bullet>",
  "reason": "<one short sentence on what specifically was improved>"
}

Pick only ONE bullet — the one with the most room for improvement. Keep the rewrite truthful to the original content (don't invent facts), just sharpen wording, add structure, and quantify impact where plausible.
`;

  try {
    const response = await fetchGroqWithRetry(apiKey, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      if (response.status === 429) {
        return res.status(429).json({
          error: "You're sending requests too fast. Wait a few seconds and try again.",
        });
      }
      return res.status(500).json({ error: "Failed to generate rewrite example." });
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const raw = choice?.message?.content || "";

    if (!raw) {
      return res.status(500).json({ error: "Failed to generate rewrite example." });
    }

    const clean = raw.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse failed for rewrite-bullet:", parseErr, "raw:", raw);
      return res.status(500).json({ error: "Failed to generate rewrite example." });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
