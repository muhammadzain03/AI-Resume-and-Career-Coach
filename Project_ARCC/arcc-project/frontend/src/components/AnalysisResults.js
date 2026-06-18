import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "./Card";
import Button from "./Button";
import prefersReducedMotion from "../utils/prefersReducedMotion";

const SCORE_DIMENSIONS = [
  { key: "keyword_match", label: "Keyword Match" },
  { key: "requirements_match", label: "Requirements Met" },
  { key: "impact_metrics", label: "Impact Metrics" },
  { key: "formatting", label: "Formatting" },
  { key: "spelling_grammar", label: "Spelling & Grammar" },
  { key: "section_order", label: "Section Order" },
];

const CATEGORY_COLORS = {
  "Section Order": "var(--cat-section)",
  "Bullet Improvement": "var(--cat-bullet)",
  "Missing Keyword": "var(--cat-keyword)",
  Formatting: "var(--cat-format)",
  Spelling: "var(--cat-spelling)",
  "Impact Metrics": "var(--cat-impact)",
  Requirement: "var(--cat-spelling)",
  General: "var(--cat-general)",
};

const PRIORITY_LABELS = { high: "High", medium: "Med", low: "Low" };

const REQ_STATUS = {
  met: { label: "Met", cls: "req--met", icon: "✓" },
  missing: { label: "Missing", cls: "req--missing", icon: "✕" },
  unclear: { label: "Unclear", cls: "req--unclear", icon: "?" },
};

function getScoreClass(score) {
  if (score >= 70) return "score--high";
  if (score >= 40) return "score--medium";
  return "score--low";
}

function getVerdict(score) {
  if (score >= 85) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Partial match";
  return "Needs work";
}

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }
    let raf;
    let start;
    const tick = (t) => {
      start ??= t;
      const p = Math.min((t - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const AnalysisResults = ({ results, jobDescription = "", resumeId = null }) => {
  const navigate = useNavigate();
  const [suggestionStates, setSuggestionStates] = useState({});
  const matchScore = results?.match_score ?? 0;
  const animatedScore = useCountUp(matchScore);
  const breakdown = results?.score_breakdown || {};
  const hardRequirements = results?.hard_requirements || [];
  const suggestions = results?.suggestions || [];

  const toggleSuggestion = (index, action) => {
    setSuggestionStates((prev) => {
      if (prev[index] === action) return { ...prev, [index]: undefined };
      return { ...prev, [index]: action };
    });
  };

  const addressedCount = Object.values(suggestionStates).filter(
    (v) => v === "accepted" || v === "dismissed"
  ).length;

  const startInterviewForRole = () => {
    navigate("/app/interview", {
      state: { jd: jobDescription, resumeId },
    });
  };

  return (
    <>
      {/* Overall score */}
      <div className="score-hero">
        <div
          className={`score-ring ${getScoreClass(matchScore)}`}
          style={{ "--score-percent": `${animatedScore}%` }}
        >
          <div className="score-ring__inner">
            <span className="score-ring__num">{Math.round(animatedScore)}</span>
            <span className="score-ring__pct">%</span>
          </div>
        </div>
        <div className="score-hero__meta">
          <span className={`score-hero__verdict ${getScoreClass(matchScore)}`}>
            {getVerdict(matchScore)}
          </span>
          <p className="score-hero__label">
            Overall match against this job description
          </p>
          {jobDescription && (
            <Button
              className="btn--pill btn--small score-hero__interview-btn"
              arrow
              onClick={startInterviewForRole}
            >
              Practice interview for this role
            </Button>
          )}
        </div>
      </div>

      {/* Hard requirements (eligibility, experience, etc.) */}
      {hardRequirements.length > 0 && (
        <Card className="info-card info-card--wide requirements-card">
          <h2>Key requirements</h2>
          <div className="requirements-list">
            {hardRequirements.map((req, i) => {
              const meta = REQ_STATUS[req.status] || REQ_STATUS.unclear;
              return (
                <div key={i} className={`requirement-row ${meta.cls}`}>
                  <span className="requirement-row__icon" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <div className="requirement-row__body">
                    <span className="requirement-row__text">
                      {req.requirement}
                    </span>
                    {req.note && (
                      <span className="requirement-row__note">{req.note}</span>
                    )}
                  </div>
                  <span className="requirement-row__status">{meta.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Score breakdown */}
      {Object.keys(breakdown).length > 0 && (
        <Card className="info-card info-card--wide score-breakdown-card">
          <h2>Score Breakdown</h2>
          <div className="score-breakdown">
            {SCORE_DIMENSIONS.filter(({ key }) => breakdown[key] != null).map(
              ({ key, label }) => {
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
                    <span className={`score-breakdown__value ${getScoreClass(val)}`}>
                      {Math.round(val)}
                    </span>
                  </div>
                );
              }
            )}
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
              const cat = typeof s === "string" ? "General" : s.category || "General";
              const section = typeof s === "string" ? "" : s.section || "";
              const text = typeof s === "string" ? s : s.text || "";
              const priority =
                typeof s === "string" ? "medium" : s.priority || "medium";
              const badgeColor = CATEGORY_COLORS[cat] || "var(--cat-general)";

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
                        <span className="suggestion-card__section">{section}</span>
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
                        state === "dismissed" ? "suggestion-btn--active" : ""
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
    </>
  );
};

export default AnalysisResults;
