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
  "matchedKeywords": ["keyword1", "keyword2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "formatIssues": ["issue1", "issue2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...]
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini error:", err);
      return res.status(500).json({ error: "Failed to analyze resume. Please try again." });
    }

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Strip any markdown fences if present
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
