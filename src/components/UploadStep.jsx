import React, { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Point to the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function UploadStep({ onAnalyze, loading, error }) {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [pdfError, setPdfError] = useState("");
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    setPdfError("");

    if (file.type === "application/pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(" ") + "\n";
        }
        setResumeText(text.trim());
        setFileName(file.name);
      } catch (err) {
        setPdfError("Could not read this PDF. Try pasting your resume as text instead.");
      }
    } else if (file.type === "text/plain") {
      const text = await file.text();
      setResumeText(text.trim());
      setFileName(file.name);
    } else {
      setPdfError("Please upload a PDF or .txt file.");
    }
  };

  const handleFileUpload = async (e) => {
    await processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    await processFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    onAnalyze({ resumeText, jobDescription });
  };

  const canSubmit = resumeText.trim().length > 50 && jobDescription.trim().length > 50;

  return (
    <div className="upload-step">
      <div className="step-grid">
        {/* Resume */}
        <div className="input-card">
          <div className="card-label">
            <span className="card-num">01</span>
            <span>Your Resume</span>
          </div>

          <div
            className={`drop-zone ${fileName ? "has-file" : ""}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {fileName ? (
              <>
                <span className="file-icon">📄</span>
                <span className="file-name">{fileName}</span>
                <span className="file-change">Click to change</span>
              </>
            ) : (
              <>
                <span className="drop-icon">↑</span>
                <span className="drop-label">Upload PDF or .txt</span>
                <span className="drop-sub">or paste below</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </div>

          {pdfError && <p className="field-error">{pdfError}</p>}

          <textarea
            className="text-input"
            placeholder="Or paste your resume text here..."
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              setFileName("");
            }}
            rows={10}
          />
        </div>

        {/* Job Description */}
        <div className="input-card">
          <div className="card-label">
            <span className="card-num">02</span>
            <span>Job Description</span>
          </div>
          <textarea
            className="text-input jd-input"
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={18}
          />
        </div>
      </div>

      {error && <p className="submit-error">{error}</p>}

      <div className="submit-row">
        <button
          className={`analyze-btn ${!canSubmit || loading ? "disabled" : ""}`}
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="spinner" />
              Analyzing...
            </span>
          ) : (
            "Scan Resume →"
          )}
        </button>
        {!canSubmit && (
          <p className="hint">Add your resume and job description to continue.</p>
        )}
      </div>
    </div>
  );
}
