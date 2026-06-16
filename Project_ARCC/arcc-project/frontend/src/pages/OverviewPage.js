import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/api";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";

const OverviewPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getHistory();
        setHistory(res.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = history.length;
  const avg = total
    ? Math.round(
        history.reduce((s, h) => s + (h.match_score || 0), 0) / total
      )
    : 0;
  const best = total
    ? Math.round(Math.max(...history.map((h) => h.match_score || 0)))
    : 0;

  if (loading) {
    return (
      <div className="page">
        <p className="page-intro">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <ScrollReveal>
        <p className="eyebrow">Dashboard</p>
        <h1>Overview</h1>
      </ScrollReveal>

      <div className="dash-stats">
        {[
          { value: total, label: "Total Analyses" },
          { value: `${avg}%`, label: "Average Score" },
          { value: `${best}%`, label: "Best Score" },
        ].map((s, i) => (
          <ScrollReveal key={i} delay={i * 0.1} scale>
            <div className="dash-stat">
              <span className="dash-stat__value">{s.value}</span>
              <span className="dash-stat__label">{s.label}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.3}>
        <div className="dash-quick-actions">
          <Card
            className="dash-action"
            onClick={() => navigate("/app/analyze")}
          >
            <h3>New Analysis</h3>
            <p>
              Upload a resume and job description for AI-powered feedback.
            </p>
          </Card>
          <Card
            className="dash-action"
            onClick={() => navigate("/app/interview")}
          >
            <h3>Practice Interview</h3>
            <p>
              Run a mock interview tailored to any job description.
            </p>
          </Card>
          <Card
            className="dash-action"
            onClick={() => navigate("/app/history")}
          >
            <h3>View History</h3>
            <p>Review past analyses and track improvement over time.</p>
          </Card>
        </div>
      </ScrollReveal>

      {history.length > 0 && (
        <ScrollReveal delay={0.4}>
          <h2 style={{ marginTop: "1.5rem" }}>Recent Analyses</h2>
          <div className="history-list">
            {history.slice(0, 5).map((item) => (
              <Card key={item.analysis_id} className="history-card">
                <h3>{item.job_title || "Untitled Role"}</h3>
                <p className="history-meta">Resume: {item.filename}</p>
                <p
                  className="history-score"
                  style={{
                    color:
                      item.match_score >= 75
                        ? "var(--score-high)"
                        : item.match_score >= 50
                        ? "var(--score-mid)"
                        : "var(--score-low)",
                  }}
                >
                  Score: {item.match_score}%
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
};

export default OverviewPage;
