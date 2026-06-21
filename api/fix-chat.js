import { getClientIp, checkAndIncrementRateLimit } from "./_lib/rateLimit.js";
import { fetchGroqWithRetry } from "./_lib/groqFetch.js";

const DAILY_LIMIT = 40; // chat turns per IP per day
const MAX_HISTORY = 20; // safety cap on conversation length

const ISSUE_LABELS = {
  missingKeyword: "missing keyword",
  formatIssue: "format issue",
  suggestion: "recommendation",
};

function buildSystemPrompt({ issueType, issueText, resumeText, jobDescription }) {
  const label = ISSUE_LABELS[issueType] || "issue";

  return `
You are an expert ATS (Applicant Tracking System) resume coach having a focused, back-and-forth chat with a candidate about ONE specific ${label} found in their resume.

The ${label} to fix:
"${issueText}"

Full resume:
${resumeText}

Job description:
${jobDescription}

Guidelines:
- Stay focused on this one ${label}. Don't re-summarize the whole resume or restate the full score.
- Give specific, actionable fixes. When proposing replacement text (a bullet point, summary line, skills entry, etc.), write it out in full so the user can copy it directly into their resume.
- Keep responses concise and conversational — a few sentences or a short list, not an essay.
- If the user asks follow-up questions or wants a different tone/angle, adapt the fix accordingly.
- Never invent facts, employers, dates, or metrics that aren't implied by the resume — ask the user for real numbers/details if a quantified fix needs them.
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { resumeText, jobDescription, issueType, issueText, messages } = req.body || {};

  if (!resumeText || !jobDescription || !issueText) {
    return res.status(400).json({ error: "Missing resume, job description, or issue context." });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "No conversation history provided." });
  }

  const trimmedMessages = messages.slice(-MAX_HISTORY);
  const last = trimmedMessages[trimmedMessages.length - 1];
  if (!last || last.role !== "user" || !last.content?.trim()) {
    return res.status(400).json({ error: "The last message must be from the user." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured." });
  }

  try {
    const ip = getClientIp(req);
    const { allowed } = await checkAndIncrementRateLimit(ip, {
      collection: "fixChatRateLimits",
      limit: DAILY_LIMIT,
    });

    if (!allowed) {
      return res.status(429).json({
        error: `Daily chat limit reached. You can send up to ${DAILY_LIMIT} fix-chat messages per day — try again tomorrow.`,
      });
    }
  } catch (err) {
    console.error("Rate limit check failed:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  const systemPrompt = buildSystemPrompt({ issueType, issueText, resumeText, jobDescription });

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...trimmedMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  try {
    const response = await fetchGroqWithRetry(apiKey, {
      messages: chatMessages,
      temperature: 0.4,
      max_tokens: 1024,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Groq error:", err);
      if (response.status === 429) {
        return res.status(429).json({
          error: "You're sending requests too fast. Wait a few seconds and try again.",
        });
      }
      return res.status(500).json({ error: "Failed to get a response. Please try again." });
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const reply = choice?.message?.content?.trim();
    const finishReason = choice?.finish_reason;

    if (!reply) {
      console.error("Groq returned no content. finishReason:", finishReason);
      return res.status(500).json({ error: "Failed to get a response. Please try again." });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
