import { getClientIp, checkAndIncrementRateLimit } from "./_lib/rateLimit.js";
import { fetchGeminiWithRetry } from "./_lib/geminiFetch.js";

// Full resume rewrite tailored to the job description. Lower ceiling than
// the lightweight endpoints since this generates a lot more text.
const DAILY_IP_LIMIT = 40;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { resumeText, jobDescription } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ error: "Resume and job description are required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured." });
  }

  try {
    const ip = getClientIp(req);
    const { allowed } = await checkAndIncrementRateLimit(ip, {
      collection: "fullRewriteRateLimits",
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
You are an expert resume writer and ATS optimization specialist. Rewrite this ENTIRE resume to be a stronger match for the job description below: tailor wording to the job's key terms, quantify impact wherever plausible, tighten weak or vague phrasing, and reorganize bullet points for clarity — without inventing facts, employers, titles, or dates that aren't in the original. Preserve section structure (e.g. Experience, Education, Skills) but improve the writing throughout.

Return structured JSON only — no markdown, no explanation, just raw JSON.

ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return this exact JSON structure:
{
  "rewrittenResume": "<the full rewritten resume as plain text, with section headers and line breaks preserved using \\n>",
  "summaryOfChanges": ["<short bullet describing one category of change>", "<another>", "<another>"]
}

Keep "summaryOfChanges" to 3-5 short, concrete bullets (e.g. "Added measurable impact to 6 bullet points", "Replaced passive phrasing with action verbs", "Worked in 8 missing ATS keywords from the job description").
`;

  try {
    const response = await fetchGeminiWithRetry(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      if (response.status === 429) {
        return res.status(429).json({
          error: "You're sending requests too fast. Wait a few seconds and try again.",
        });
      }
      return res.status(500).json({ error: "Failed to generate resume rewrite." });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const raw = candidate?.content?.parts?.[0]?.text || "";

    if (!raw) {
      return res.status(500).json({ error: "Failed to generate resume rewrite." });
    }

    const clean = raw.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse failed for rewrite-resume:", parseErr, "raw:", raw);
      return res.status(500).json({ error: "Failed to generate resume rewrite." });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
