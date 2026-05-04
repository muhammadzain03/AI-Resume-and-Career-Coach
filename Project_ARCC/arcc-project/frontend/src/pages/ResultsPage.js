import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { getAnalysis } from "../services/api";
import { useWorkflow } from "../context/WorkflowContext";

const ResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { analysisId } = useWorkflow();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const resolvedId = id || analysisId || localStorage.getItem("analysis_id");

  useEffect(() => {
    if (!id && resolvedId) {
      navigate(`/results/${resolvedId}`, { replace: true });
    }
  }, [id, resolvedId, navigate]);

  useEffect(() => {
    if (!resolvedId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const result = await getAnalysis(resolvedId);
        setData(result);
      } catch (err) {
        setError(err.message || "Failed to fetch analysis");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [resolvedId]);

  if (!resolvedId) return <p>No analysis found.</p>;
  if (loading) return <p>Loading analysis...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!data) return <p>No data found.</p>;

  const skillGaps = data.missing_skills || [];
  const matchedSkills = data.matched_skills || [];
  const suggestions = data.suggestions || [];
  const matchScore = data.match_score ?? 0;

  // Score color logic
  const getScoreClass = (score) => {
    if (score >= 70) return "score--high";
    if (score >= 40) return "score--medium";
    return "score--low";
  };

  const ChipList = ({ items }) => (
    <div className="chip-container">
      {items.map((s, i) => (
        <span key={i} className="feature-chip">
          {s}
        </span>
      ))}
    </div>
  );

  return (
    <div className="page">
      <p className="eyebrow">Step 3</p>
      <h1>Analysis Results</h1>

      {/* SCORE (top, emphasized) */}
      <div className="score-wrapper">
        <div className={`score-pill ${getScoreClass(matchScore)}`}>
          {matchScore.toFixed(1)}%
        </div>
        <p className="score-label">Overall Match Score</p>
      </div>

      <div className="info-grid">
        <Card className="info-card">
          <h2>Missing Skills</h2>
          {skillGaps.length ? (
            <ChipList items={skillGaps} />
          ) : (
            <p className="muted">No major gaps detected</p>
          )}
        </Card>

        <Card className="info-card">
          <h2>Matched Skills</h2>
          {matchedSkills.length ? (
            <ChipList items={matchedSkills} />
          ) : (
            <p className="muted">No matches found</p>
          )}
        </Card>

        <Card className="info-card info-card--wide">
          <h2>Improvement Suggestions</h2>
          {suggestions.length ? (
            <ul className="suggestion-list">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No suggestions available</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResultsPage;