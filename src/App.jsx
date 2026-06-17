import React, { useState } from "react";
import UploadStep from "./components/UploadStep";
import ResultsView from "./components/ResultsView";
import "./App.css";

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async ({ resumeText, jobDescription }) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">ATScan</span>
          </div>
          <p className="tagline">Know your score before they do.</p>
        </div>
      </header>

      <main className="app-main">
        {result ? (
          <ResultsView result={result} onReset={handleReset} />
        ) : (
          <UploadStep onAnalyze={handleAnalyze} loading={loading} error={error} />
        )}
      </main>

      <footer className="app-footer">
        <p>Built with Gemini · Free to use · No data stored</p>
      </footer>
    </div>
  );
}
