import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";
import Button from "../components/Button";
import { uploadResume, runAnalysis, getAnalysis } from "../services/api";
import { validateResumeFile } from "../utils/validation";

const SCORE_DIMENSIONS = [
  { key: "keyword_match", label: "Keyword Match" },
  { key: "formatting", label: "Formatting" },
  { key: "spelling_grammar", label: "Spelling & Grammar" },
  { key: "impact_metrics", label: "Impact Metrics" },
  { key: "section_order", label: "Section Order" },
];

const CATEGORY_COLORS = {
  "Section Order": "var(--cat-section)",
  "Bullet Improvement": "var(--cat-bullet)",
  "Missing Keyword": "var(--cat-keyword)",
  "Formatting": "var(--cat-format)",
  "Spelling": "var(--cat-spelling)",
  "Impact Metrics": "var(--cat-impact)",
  "General": "var(--cat-general)",
};

const PRIORITY_LABELS = {
  high: "High",
  medium: "Med",
  low: "Low",
};

const PARSE_ERROR_MESSAGE =
  "That file wouldn't parse. Try a text-based PDF or a DOCX - scanned images won't work.";

function getAnalyzeErrorMessage(err) {
  const msg = (err?.message || "").toLowerCase();
  if (
    msg.includes("parse") ||
    msg.includes("extract") ||
    msg.includes("text-based")
  ) {
    return PARSE_ERROR_MESSAGE;
  }
  return err?.message || "Something went wrong. Please try again.";
}

const AnalyzePage = () => {
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [suggestionStates, setSuggestionStates] = useState({});
  const [dragging, setDragging] = useState(false);
  const resultsRef = useRef(null);

  const acceptFile = (f) => {
    if (!f) return;
    const validationError = validateResumeFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  };

  const handleFileChange = (e) => acceptFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (uploading || analyzing) return;
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!uploading && !analyzing) setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a resume file.");
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Please enter a job description (at least 20 characters).");
      return;
    }

    setError("");
    setResults(null);
    setSuggestionStates({});
    setUploading(true);
    setProgress("Uploading resume...");

    try {
      const uploadResult = await uploadResume(file);
      const resumeId =
        uploadResult?.resume_id || uploadResult?.data?.resume_id;
      if (!resumeId) throw new Error("Upload failed - no resume ID returned.");
      localStorage.setItem("resume_id", resumeId);

      setUploading(false);
      setAnalyzing(true);
      setProgress("Reading your resume the way an ATS would...");

      const analysisResult = await runAnalysis(resumeId, description.trim());
      const analysisId =
        analysisResult?.analysis_id || analysisResult?.data?.analysis_id;
      if (!analysisId)
        throw new Error("Analysis failed - no analysis ID returned.");

      setProgress("Fetching results...");
      const data = await getAnalysis(analysisId);
      setResults(data);
      setProgress("");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch (err) {
      setError(getAnalyzeErrorMessage(err));
      setProgress("");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const matchScore = results?.match_score ?? 0;
  const breakdown = results?.score_breakdown || {};

  const getScoreClass = (score) => {
    if (score >= 70) return "score--high";
    if (score >= 40) return "score--medium";
    return "score--low";
  };

  const getVerdict = (score) => {
    if (score >= 85) return "Strong match";
    if (score >= 70) return "Good match";
    if (score >= 50) return "Partial match";
    return "Needs work";
  };

  const toggleSuggestion = (index, action) => {
    setSuggestionStates((prev) => {
      const current = prev[index];
      if (current === action) return { ...prev, [index]: undefined };
      return { ...prev, [index]: action };
    });
  };

  const suggestions = results?.suggestions || [];
  const addressedCount = Object.values(suggestionStates).filter(
    (v) => v === "accepted" || v === "dismissed"
  ).length;

  return (
    <div className="analyze-page">
      <ScrollReveal>
        <p className="eyebrow">Analyze</p>
        <h1>Resume Analysis</h1>
        <p className="page-intro">
          Upload your resume and a job description to get an instant match
          score, skill gaps, and improvement suggestions.
        </p>
      </ScrollReveal>

      <div className="analyze-form">
        <ScrollReveal delay={0.1} className="analyze-col">
          <Card className="analyze-card">
            <div className="analyze-card__head">
              <span className="step-badge">1</span>
              <div>
                <h2>Upload resume</h2>
                <p className="analyze-card__hint">PDF or DOCX, up to 4 MB</p>
              </div>
            </div>
            <label
              className={`dropzone${dragging ? " dropzone--active" : ""}${
                file ? " dropzone--filled" : ""
              }`}
              htmlFor="analyze-resume"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <span className="dropzone__icon" aria-hidden="true">
                {file ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </span>
              {file ? (
                <span className="dropzone__file">{file.name}</span>
              ) : (
                <>
                  <span className="dropzone__title">
                    {dragging ? "Drop to upload" : "Drop your resume here"}
                  </span>
                  <span className="dropzone__hint">
                    or click to browse · PDF, DOCX
                  </span>
                </>
              )}
              <input
                id="analyze-resume"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                disabled={uploading || analyzing}
              />
            </label>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="analyze-col">
          <Card className="analyze-card">
            <div className="analyze-card__head">
              <span className="step-badge">2</span>
              <div>
                <h2>Job description</h2>
                <p className="analyze-card__hint">
                  Paste the role you&apos;re targeting
                </p>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyze-title">
                Job Title
              </label>
              <input
                id="analyze-title"
                className="input"
                placeholder="e.g. Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={uploading || analyzing}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyze-jd">
                Description
              </label>
              <textarea
                id="analyze-jd"
                className="textarea"
                placeholder="Paste the full job description here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="6"
                disabled={uploading || analyzing}
              />
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.3} className="analyze-form__actions">
          <div className="analyze-actions">
            <Button
              onClick={handleAnalyze}
              disabled={uploading || analyzing || !file}
              arrow
              className="btn--pill"
            >
              {uploading
                ? "Uploading..."
                : analyzing
                ? "Analyzing..."
                : "Analyze Resume"}
            </Button>
            {progress && (
              <p className="status-text status-text--info">{progress}</p>
            )}
            {error && (
              <p className="status-text status-text--error">{error}</p>
            )}
          </div>
        </ScrollReveal>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div
            ref={resultsRef}
            className="analyze-results"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="analyze-results__divider" />
            <h2 className="analyze-results__heading">Results</h2>

            {/* Overall score */}
            <div className="score-hero">
              <div
                className={`score-ring ${getScoreClass(matchScore)}`}
                style={{ "--score-percent": `${matchScore}%` }}
              >
                <div className="score-ring__inner">
                  <span className="score-ring__num">
                    {Math.round(matchScore)}
                  </span>
                  <span className="score-ring__pct">%</span>
                </div>
              </div>
              <div className="score-hero__meta">
                <span
                  className={`score-hero__verdict ${getScoreClass(matchScore)}`}
                >
                  {getVerdict(matchScore)}
                </span>
                <p className="score-hero__label">
                  Overall match against this job description
                </p>
              </div>
            </div>

            {/* Score breakdown */}
            {Object.keys(breakdown).length > 0 && (
              <Card className="info-card info-card--wide score-breakdown-card">
                <h2>Score Breakdown</h2>
                <div className="score-breakdown">
                  {SCORE_DIMENSIONS.map(({ key, label }) => {
                    const val = breakdown[key] ?? 0;
                    return (
                      <div key={key} className="score-breakdown__row">
                        <span className="score-breakdown__label">{label}</span>
                        <div className="score-breakdown__bar-track">
                          <div
                            className={`score-breakdown__bar-fill ${getScoreClass(val)}`}
                            style={{ width: `${Math.min(val, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`score-breakdown__value ${getScoreClass(val)}`}
                        >
                          {Math.round(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Skills */}
            <div className="info-grid">
              <Card className="info-card">
                <h2>Missing Skills</h2>
                {(results.missing_skills || []).length ? (
                  <div className="chip-container">
                    {results.missing_skills.map((s, i) => (
                      <span key={i} className="feature-chip">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No major gaps detected</p>
                )}
              </Card>

              <Card className="info-card">
                <h2>Matched Skills</h2>
                {(results.matched_skills || []).length ? (
                  <div className="chip-container">
                    {results.matched_skills.map((s, i) => (
                      <span key={i} className="feature-chip">
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No matches found</p>
                )}
              </Card>
            </div>

            {/* Suggestions */}
            <Card className="info-card info-card--wide suggestions-section">
              <div className="suggestions-header">
                <h2>Suggestions</h2>
                {suggestions.length > 0 && (
                  <span className="suggestions-counter">
                    {addressedCount}/{suggestions.length} addressed
                  </span>
                )}
              </div>

              {suggestions.length > 0 ? (
                <div className="suggestion-cards">
                  {suggestions.map((s, i) => {
                    const state = suggestionStates[i];
                    const cat =
                      typeof s === "string" ? "General" : s.category || "General";
                    const section =
                      typeof s === "string" ? "" : s.section || "";
                    const text = typeof s === "string" ? s : s.text || "";
                    const priority =
                      typeof s === "string" ? "medium" : s.priority || "medium";
                    const badgeColor =
                      CATEGORY_COLORS[cat] || "var(--cat-general)";

                    return (
                      <div
                        key={i}
                        className={`suggestion-card ${
                          state === "accepted"
                            ? "suggestion-card--accepted"
                            : state === "dismissed"
                            ? "suggestion-card--dismissed"
                            : ""
                        }`}
                      >
                        <div className="suggestion-card__body">
                          <div className="suggestion-card__meta">
                            <span
                              className="suggestion-card__badge"
                              style={{ backgroundColor: badgeColor }}
                            >
                              {cat}
                            </span>
                            {section && (
                              <span className="suggestion-card__section">
                                {section}
                              </span>
                            )}
                            <span
                              className={`suggestion-card__priority suggestion-card__priority--${priority}`}
                            >
                              {PRIORITY_LABELS[priority] || priority}
                            </span>
                          </div>
                          <p className="suggestion-card__text">{text}</p>
                        </div>

                        <div className="suggestion-card__actions">
                          <button
                            className={`suggestion-btn suggestion-btn--accept ${
                              state === "accepted" ? "suggestion-btn--active" : ""
                            }`}
                            onClick={() => toggleSuggestion(i, "accepted")}
                            title="Mark as done"
                            aria-label="Accept suggestion"
                          >
                            &#10003;
                          </button>
                          <button
                            className={`suggestion-btn suggestion-btn--dismiss ${
                              state === "dismissed"
                                ? "suggestion-btn--active"
                                : ""
                            }`}
                            onClick={() => toggleSuggestion(i, "dismissed")}
                            title="Dismiss"
                            aria-label="Dismiss suggestion"
                          >
                            &#10005;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">No suggestions available</p>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalyzePage;
