import React, { useEffect, useRef, useState } from "react";

export default function FullRewriteDrawer({ resumeText, jobDescription, onClose }) {
  const [state, setState] = useState("loading"); // loading | done | error
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const run = async () => {
      try {
        const res = await fetch("/api/rewrite-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText, jobDescription }),
        });
        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json?.error || "Couldn't generate the rewrite. Please try again.");
          setState("error");
          return;
        }
        setData(json);
        setState("done");
      } catch {
        setErrorMsg("Couldn't generate the rewrite. Please try again.");
        setState("error");
      }
    };
    run();
  }, [resumeText, jobDescription]);

  const handleCopy = async () => {
    if (!data?.rewrittenResume) return;
    try {
      await navigator.clipboard.writeText(data.rewrittenResume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="fix-drawer rewrite-drawer-wide" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-header-text">
            <span className="drawer-label">Full AI Resume Rewrite</span>
            <p className="drawer-issue">Tailored to your job description</p>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="drawer-body">
          {state === "loading" && (
            <div className="chat-bubble chat-assistant chat-typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}

          {state === "error" && (
            <p className="field-error drawer-error">{errorMsg}</p>
          )}

          {state === "done" && data && (
            <>
              {data.summaryOfChanges?.length > 0 && (
                <div className="rewrite-changes">
                  <span className="bullet-label">What changed</span>
                  <ul>
                    {data.summaryOfChanges.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="rewrite-text">{data.rewrittenResume}</pre>
            </>
          )}
        </div>

        {state === "done" && (
          <div className="drawer-footer">
            <button className="chat-send-btn" onClick={handleCopy}>
              {copied ? "Copied ✓" : "Copy to clipboard"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
