import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal";
import AnalysisResults from "../components/AnalysisResults";
import { getAnalysis } from "../services/api";

const AnalysisDetailPage = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getAnalysis(analysisId);
        if (active) setResults(data);
      } catch (err) {
        if (active) setError(err?.message || "Could not load this analysis.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [analysisId]);

  return (
    <div className="analyze-page">
      <ScrollReveal>
        <button
          type="button"
          className="back-link"
          onClick={() => navigate("/app/history")}
        >
          ← Back to history
        </button>
        <p className="eyebrow">Past analysis</p>
        <h1>Resume analysis</h1>
      </ScrollReveal>

      {loading && <p className="page-intro">Loading analysis…</p>}
      {error && !loading && (
        <p className="status-text status-text--error">{error}</p>
      )}

      {results && !loading && (
        <div className="analyze-results">
          <div className="analyze-results__divider" />
          <AnalysisResults
            results={results}
            jobDescription={results.job_description || ""}
            resumeId={results.resume_id || null}
          />
        </div>
      )}
    </div>
  );
};

export default AnalysisDetailPage;
