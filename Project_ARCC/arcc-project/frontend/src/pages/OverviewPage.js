import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/api";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";
import { useAuth } from "../context/AuthContext";

const I = {
  doc: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  gauge: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 14l4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
};

const OverviewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const firstName = (user?.name || user?.email || "there").split(/[\s@]/)[0];
  const total = history.length;
  const avg = total
    ? Math.round(history.reduce((s, h) => s + (h.match_score || 0), 0) / total)
    : 0;
  const best = total
    ? Math.round(Math.max(...history.map((h) => h.match_score || 0)))
    : 0;

  const stats = [
    { icon: I.doc, value: total, label: "Total Analyses" },
    { icon: I.gauge, value: `${avg}%`, label: "Average Score" },
    { icon: I.star, value: `${best}%`, label: "Best Score" },
  ];

  const actions = [
    {
      icon: I.search,
      title: "New Analysis",
      desc: "Upload a resume and job description for AI-powered feedback.",
      to: "/app/analyze",
    },
    {
      icon: I.mic,
      title: "Practice Interview",
      desc: "Run a mock interview tailored to any job description.",
      to: "/app/interview",
    },
    {
      icon: I.clock,
      title: "View History",
      desc: "Review past analyses and track improvement over time.",
      to: "/app/history",
    },
  ];

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
        <div className="dash-greeting">
          <p className="eyebrow">Dashboard</p>
          <h1 className="dash-greeting__title">
            Welcome back, <span className="dash-greeting__name">{firstName}</span>
          </h1>
          <p className="page-intro">
            {total
              ? "Pick up where you left off, or start something new."
              : "Let's get your first resume scored. It takes under a minute."}
          </p>
        </div>
      </ScrollReveal>

      <div className="dash-stats">
        {stats.map((s, i) => (
          <ScrollReveal key={s.label} delay={i * 0.08} scale>
            <div className="dash-stat">
              <span className="dash-stat__icon">{s.icon}</span>
              <span className="dash-stat__value">{s.value}</span>
              <span className="dash-stat__label">{s.label}</span>
            </div>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.2}>
        <h2 className="dash-section-title">Quick actions</h2>
        <div className="dash-quick-actions">
          {actions.map((a) => (
            <Card
              key={a.title}
              className="dash-action"
              onClick={() => navigate(a.to)}
            >
              <span className="dash-action__icon">{a.icon}</span>
              <span className="dash-action__arrow">{I.arrow}</span>
              <h3>{a.title}</h3>
              <p>{a.desc}</p>
            </Card>
          ))}
        </div>
      </ScrollReveal>

      {history.length > 0 && (
        <ScrollReveal delay={0.3}>
          <h2 className="dash-section-title">Recent analyses</h2>
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
