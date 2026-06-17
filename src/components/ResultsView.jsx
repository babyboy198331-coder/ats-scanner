import React, { useState } from "react";
import FixChatDrawer from "./FixChatDrawer";

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  const label =
    score >= 80 ? "Strong Match" : score >= 60 ? "Moderate Match" : score >= 40 ? "Weak Match" : "Poor Match";

  return (
    <div className="score-ring-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--ring-bg)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="70" y="65" textAnchor="middle" className="score-number" fill="var(--text-primary)">
          {score}
        </text>
        <text x="70" y="82" textAnchor="middle" className="score-pct" fill="var(--text-muted)">
          / 100
        </text>
      </svg>
      <span className="score-label" style={{ color }}>{label}</span>
    </div>
  );
}

function TagList({ items, variant }) {
  if (!items || items.length === 0) return <p className="empty-list">None identified</p>;
  return (
    <div className="tag-list">
      {items.map((item, i) => (
        <span key={i} className={`tag tag-${variant}`}>{item}</span>
      ))}
    </div>
  );
}

function IssueRowList({ items, onFix }) {
  if (!items || items.length === 0) return <p className="empty-list">None identified</p>;
  return (
    <ul className="issue-row-list">
      {items.map((item, i) => (
        <li key={i} className="issue-row">
          <span className="issue-row-text">{item}</span>
          <button className="fix-btn" onClick={() => onFix(item)}>Fix this</button>
        </li>
      ))}
    </ul>
  );
}

function SuggestionList({ items, onFix }) {
  if (!items || items.length === 0) return <p className="empty-list">No suggestions</p>;
  return (
    <ul className="suggestion-list">
      {items.map((item, i) => (
        <li key={i} className="issue-row">
          <span className="issue-row-text">{item}</span>
          <button className="fix-btn" onClick={() => onFix(item)}>Fix this</button>
        </li>
      ))}
    </ul>
  );
}

export default function ResultsView({ result, inputs, onReset }) {
  const { score, summary, matchedKeywords, missingKeywords, formatIssues, suggestions } = result;
  const [activeIssue, setActiveIssue] = useState(null);

  const openFix = (issueType) => (issueText) => setActiveIssue({ issueType, issueText });
  const closeFix = () => setActiveIssue(null);

  return (
    <div className="results-view">
      <div className="results-header">
        <div className="results-title-row">
          <h2>ATS Analysis</h2>
          <button className="reset-btn" onClick={onReset}>← Scan Another</button>
        </div>
        <p className="results-summary">{summary}</p>
      </div>

      <div className="results-grid">
        {/* Score */}
        <div className="result-card score-card">
          <h3>ATS Score</h3>
          <ScoreRing score={score} />
        </div>

        {/* Matched Keywords */}
        <div className="result-card">
          <h3>
            <span className="dot dot-green" />
            Matched Keywords
            <span className="count">{matchedKeywords?.length || 0}</span>
          </h3>
          <TagList items={matchedKeywords} variant="matched" />
        </div>

        {/* Missing Keywords */}
        <div className="result-card">
          <h3>
            <span className="dot dot-red" />
            Missing Keywords
            <span className="count">{missingKeywords?.length || 0}</span>
          </h3>
          <IssueRowList items={missingKeywords} onFix={openFix("missingKeyword")} />
        </div>

        {/* Format Issues */}
        <div className="result-card">
          <h3>
            <span className="dot dot-yellow" />
            Format Issues
            <span className="count">{formatIssues?.length || 0}</span>
          </h3>
          <IssueRowList items={formatIssues} onFix={openFix("formatIssue")} />
        </div>

        {/* Suggestions */}
        <div className="result-card suggestions-card">
          <h3>
            <span className="dot dot-blue" />
            Recommendations
          </h3>
          <SuggestionList items={suggestions} onFix={openFix("suggestion")} />
        </div>
      </div>

      {activeIssue && inputs && (
        <FixChatDrawer
          issueType={activeIssue.issueType}
          issueText={activeIssue.issueText}
          resumeText={inputs.resumeText}
          jobDescription={inputs.jobDescription}
          onClose={closeFix}
        />
      )}
    </div>
  );
}
