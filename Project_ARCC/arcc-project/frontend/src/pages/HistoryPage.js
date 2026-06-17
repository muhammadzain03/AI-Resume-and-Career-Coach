import React, { useEffect, useState } from "react";
import {
  getHistory,
  getInterviewHistory,
  getInterviewSession,
} from "../services/api";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";

function scoreColor(score) {
  if (score >= 75) return "var(--score-high)";
  if (score >= 50) return "var(--score-mid)";
  return "var(--score-low)";
}

const InterviewHistoryCard = ({ item }) => {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !transcript) {
      setLoading(true);
      try {
        const data = await getInterviewSession(item.session_id);
        setTranscript(data.history || []);
      } catch (err) {
        console.error(err);
        setTranscript([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card className="history-card">
      <h3>{item.role ? `Interview · ${item.role}` : "Mock interview"}</h3>
      <p className="history-date">
        {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
      </p>
      {item.summary && <p className="history-meta">{item.summary}</p>}

      <button
        type="button"
        className="history-toggle"
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? "Hide transcript" : "Review transcript"}
      </button>

      {open && (
        <div className="history-transcript">
          {loading && <p className="muted">Loading transcript…</p>}
          {!loading && transcript && transcript.length === 0 && (
            <p className="muted">No answers were recorded for this session.</p>
          )}
          {!loading &&
            transcript &&
            transcript.map((turn, i) => (
              <div key={i} className="history-turn">
                {turn.question && (
                  <p className="history-turn__q">
                    <span>Q</span>
                    {turn.question}
                  </p>
                )}
                {turn.answer && (
                  <p className="history-turn__a">
                    <span>A</span>
                    {turn.answer}
                  </p>
                )}
                {turn.feedback && (
                  <p className="history-turn__f">
                    <span>Feedback</span>
                    {turn.feedback}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}
    </Card>
  );
};

const HistoryPage = () => {
  const [analyses, setAnalyses] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, i] = await Promise.allSettled([
        getHistory(),
        getInterviewHistory(),
      ]);
      if (a.status === "fulfilled") setAnalyses(a.value.history || []);
      if (i.status === "fulfilled") setInterviews(i.value.sessions || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <p className="page-intro">Loading history...</p>
      </div>
    );
  }

  const nothing = !analyses.length && !interviews.length;

  return (
    <div className="page">
      <ScrollReveal>
        <p className="eyebrow">History</p>
        <h1>Your activity</h1>
      </ScrollReveal>

      {nothing ? (
        <ScrollReveal delay={0.1}>
          <div className="dash-empty">
            <h2>Nothing here yet</h2>
            <p>Upload a resume to see your first score, or run a mock interview.</p>
          </div>
        </ScrollReveal>
      ) : (
        <>
          <ScrollReveal delay={0.1}>
            <h2 className="history-section-title">Past analyses</h2>
            {analyses.length ? (
              <div className="history-list">
                {analyses.map((item) => (
                  <Card key={item.analysis_id} className="history-card">
                    <h3>{item.job_title || "Untitled Role"}</h3>
                    <p className="history-meta">Resume: {item.filename}</p>
                    <p
                      className="history-score"
                      style={{ color: scoreColor(item.match_score) }}
                    >
                      Score: {item.match_score}%
                    </p>
                    <p className="history-date">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="muted">No analyses yet.</p>
            )}
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <h2 className="history-section-title">Interview practice</h2>
            {interviews.length ? (
              <div className="history-list">
                {interviews.map((item) => (
                  <InterviewHistoryCard key={item.session_id} item={item} />
                ))}
              </div>
            ) : (
              <p className="muted">
                No interviews yet. Run a mock interview to see feedback here.
              </p>
            )}
          </ScrollReveal>
        </>
      )}
    </div>
  );
};

export default HistoryPage;
