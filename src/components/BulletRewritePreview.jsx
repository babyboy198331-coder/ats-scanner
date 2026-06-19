import React, { useState } from "react";

export default function BulletRewritePreview({ resumeText, jobDescription }) {
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRewrite = async () => {
    setState("loading");
    try {
      const res = await fetch("/api/rewrite-bullet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json?.error || "Couldn't generate a rewrite. Try again in a moment.");
        setState("error");
        return;
      }
      setData(json);
      setState("done");
    } catch {
      setErrorMsg("Couldn't generate a rewrite. Try again in a moment.");
      setState("error");
    }
  };

  if (state === "idle") {
    return (
      <div className="result-card bullet-rewrite-card">
        <h3>
          <span className="dot dot-blue" />
          AI Bullet Rewrite
        </h3>
        <p className="bullet-intro">See how AI would rewrite your weakest bullet point for this job.</p>
        <button className="bullet-cta-btn" onClick={fetchRewrite}>
          ✨ See an AI rewrite example
        </button>
      </div>
    );
  }

  return (
    <div className="result-card bullet-rewrite-card">
      <h3>
        <span className="dot dot-blue" />
        AI Bullet Rewrite
      </h3>

      {state === "loading" && <p className="bullet-loading">Finding your weakest bullet…</p>}
      {state === "error" && <p className="bullet-loading">{errorMsg}</p>}

      {state === "done" && data && (
        <div className="bullet-compare">
          <div className="bullet-block bullet-before">
            <span className="bullet-label">Before</span>
            <p>{data.originalBullet}</p>
          </div>
          <div className="bullet-block bullet-after">
            <span className="bullet-label">After</span>
            <p>{data.rewrittenBullet}</p>
          </div>
          {data.reason && <p className="bullet-reason">{data.reason}</p>}
        </div>
      )}
    </div>
  );
}
