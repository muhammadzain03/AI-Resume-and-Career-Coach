import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/api";
import Card from "../components/Card";

const getScoreColor = (score) => {
  if (score >= 75) return "#4CAF50";   // green
  if (score >= 50) return "#FFC107";   // yellow
  return "#F44336";                   // red
};

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await getHistory(0); // or real user_id later
        setHistory(res.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  if (loading) return <p>Loading history...</p>;

  if (!history.length) {
    return <p>No previous analyses found.</p>;
  }

  return (
    <div className="page">
      <h1>Past Analyses</h1>

      <div className="history-list">
        {history.map((item) => (
          <Card
            key={item.analysis_id}
            className="history-card"
            onClick={() => navigate(`/results/${item.analysis_id}`)}
          >
            <h3>{item.job_title || "Untitled Role"}</h3>

            <p className="history-meta">
              Resume: {item.filename}
            </p>

            <p className="history-score"
                style={{ color: getScoreColor(item.match_score) }}
                >
                Score: {item.match_score}%
            </p>

            <p className="history-date">
              {new Date(item.created_at).toLocaleString()}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;