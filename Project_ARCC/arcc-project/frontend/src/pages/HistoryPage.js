import React, { useEffect, useState } from "react";
import { getHistory } from "../services/api";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";

const HistoryPage = () => {
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

  if (loading) {
    return (
      <div className="page">
        <p className="page-intro">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <ScrollReveal>
        <p className="eyebrow">History</p>
        <h1>Past Analyses</h1>
      </ScrollReveal>

      {!history.length ? (
        <ScrollReveal delay={0.1}>
          <div className="dash-empty">
            <h2>No analyses yet</h2>
            <p>No analyses yet? Upload a resume to see your first score.</p>
          </div>
        </ScrollReveal>
      ) : (
        <ScrollReveal delay={0.1}>
          <div className="history-list">
            {history.map((item) => (
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
                <p className="history-date">
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </Card>
            ))}
          </div>
        </ScrollReveal>
      )}
    </div>
  );
};

export default HistoryPage;
