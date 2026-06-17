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
  const resultsRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
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
        <ScrollReveal delay={0.1}>
          <Card className="analyze-card">
            <h2>1. Upload Resume</h2>
            <p className="analyze-card__hint">PDF or DOCX, up to 4 MB</p>
            <label className="file-input" htmlFor="analyze-resume">
              <span>
                {file ? file.name : "Drop a PDF or DOCX here, or click to browse."}
              </span>
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

        <ScrollReveal delay={0.2}>
          <Card className="analyze-card">
            <h2>2. Job Description</h2>
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
                rows="8"
                disabled={uploading || analyzing}
              />
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <div className="analyze-actions">
            <Button
              onClick={handleAnalyze}
              disabled={uploading || analyzing || !file}
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
            <div className="score-wrapper">
              <div className={`score-pill ${getScoreClass(matchScore)}`}>
                {matchScore.toFixed(1)}%
              </div>
              <p className="score-label">Overall Match Score</p>
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
