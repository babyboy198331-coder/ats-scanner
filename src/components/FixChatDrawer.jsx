import React, { useEffect, useRef, useState } from "react";

const ISSUE_LABELS = {
  missingKeyword: "Missing Keyword",
  formatIssue: "Format Issue",
  suggestion: "Recommendation",
};

export default function FixChatDrawer({ issueType, issueText, resumeText, jobDescription, onClose }) {
  // `history` is the full conversation sent to the API (includes the hidden seed turn).
  // `messages` mirrors it minus anything marked hidden, for rendering.
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bodyRef = useRef(null);
  const hasInitialized = useRef(false);

  const sendTurn = async (nextHistory) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/fix-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          issueType,
          issueText,
          messages: nextHistory.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setHistory([...nextHistory, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const seed = [
      { role: "user", content: "Give me a specific, actionable fix for this issue.", hidden: true },
    ];
    setHistory(seed);
    sendTurn(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history, loading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextHistory = [...history, { role: "user", content: text }];
    setHistory(nextHistory);
    setInput("");
    sendTurn(nextHistory);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const visibleMessages = history.filter((m) => !m.hidden);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="fix-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-header-text">
            <span className="drawer-label">{ISSUE_LABELS[issueType] || "Issue"}</span>
            <p className="drawer-issue">{issueText}</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="drawer-body" ref={bodyRef}>
          {visibleMessages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-${m.role}`}>
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble chat-assistant chat-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
          {error && <p className="field-error drawer-error">{error}</p>}
        </div>

        <div className="drawer-footer">
          <textarea
            className="chat-input"
            placeholder="Ask a follow-up, request a different rewrite..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={loading}
          />
          <button
            className={`chat-send-btn ${!input.trim() || loading ? "disabled" : ""}`}
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
