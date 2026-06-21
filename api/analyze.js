import { fetchGroqWithRetry } from "./_lib/groqFetch.js";

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

  const prompt = `
You are an expert ATS (Applicant Tracking System) analyst. Analyze the resume against the job description and return a structured JSON response only — no markdown, no explanation, just raw JSON.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return this exact JSON structure:
{
  "score": <number 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "matchedKeywords": ["keyword1", "keyword2", ...up to 12],
  "missingKeywords": ["keyword1", "keyword2", ...up to 12],
  "formatIssues": ["issue1", "issue2", ...up to 6],
  "suggestions": ["suggestion1", "suggestion2", ...up to 6]
}

Scoring guide:
- 80-100: Strong match, likely to pass ATS
- 60-79: Moderate match, needs some improvement
- 40-59: Weak match, significant gaps
- 0-39: Poor match, major revisions needed

Be specific with keywords — use the exact terms from the job description.
Format issues should flag things like: missing sections, tables, graphics, unusual fonts, missing contact info, or lack of quantified achievements.
Suggestions should be actionable and specific to this resume/JD pair.
`;

  try {
    const response = await fetchGroqWithRetry(apiKey, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 8192,
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
      return res.status(500).json({ error: "Failed to analyze resume. Please try again." });
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const raw = choice?.message?.content || "";
    const finishReason = choice?.finish_reason;

    if (!raw) {
      console.error("Groq returned no content. finishReason:", finishReason);
      return res.status(500).json({ error: "Failed to analyze resume. Please try again." });
    }

    // Strip any markdown fences if present, just in case
    const clean = raw.replace(/```json|```/g, "").trim();

    let result;
    try {
      result = JSON.parse(clean);
    } catch (parseErr) {
      console.error(
        "JSON parse failed. finishReason:",
        finishReason,
        "raw length:",
        raw.length,
        "raw:",
        raw
      );
      if (finishReason === "length") {
        return res.status(500).json({
          error: "The analysis was too long to complete. Try shortening your resume or job description.",
        });
      }
      return res.status(500).json({ error: "Failed to analyze resume. Please try again." });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
