import React, { useState } from "react";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import InterviewChat from "../components/InterviewChat";
import ScrollReveal from "../components/ScrollReveal";

const EXPECTATIONS = [
  "Role-specific behavioral and technical questions",
  "Real-time feedback after every answer",
  "Answer by voice or text — your choice",
  "A summary of what to tighten at the end",
];

const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const InterviewPage = () => {
  const [started, setStarted] = useState(false);
  const [jd, setJd] = useState("");
  const [role, setRole] = useState("");

  const handleStart = (e) => {
    e.preventDefault();
    if (jd.trim()) setStarted(true);
  };

  if (started) {
    return <InterviewChat jobDescription={jd} role={role} />;
  }

  return (
    <div className="page interview-setup">
      <ScrollReveal>
        <p className="eyebrow">Interview</p>
        <h1>Interview practice</h1>
        <p className="page-intro">
          Rehearse with an AI interviewer that adapts to the role you paste.
          Speak or type your answers and get feedback after every one.
        </p>
      </ScrollReveal>

      <div className="interview-setup__grid">
        <ScrollReveal delay={0.1} className="interview-setup__col">
          <Card className="interview-intro">
            <div className="interview-intro__coach">
              <img
                src={`${process.env.PUBLIC_URL || ""}/interview-host.svg`}
                alt="AI Interview Coach"
                className="interview-intro__avatar"
              />
              <div>
                <h2>RCC Interview Coach</h2>
                <p className="interview-intro__role">
                  Warm, structured, role-aware
                </p>
              </div>
            </div>
            <ul className="interview-intro__list">
              {EXPECTATIONS.map((item) => (
                <li key={item}>
                  <span className="interview-intro__check">
                    <Check />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="interview-setup__col">
          <Card className="interview-start">
            <h2>Start a session</h2>
            <p className="muted interview-start__hint">
              Paste a job description to generate tailored questions.
            </p>
            <form onSubmit={handleStart}>
              <Input
                id="interview-role"
                label="Role / Title (optional)"
                placeholder="e.g. Software Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
              <div className="input-group">
                <label className="input-label" htmlFor="interview-jd">
                  Job Description
                </label>
                <textarea
                  id="interview-jd"
                  className="textarea"
                  placeholder="Paste the job description here..."
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  rows="7"
                  required
                />
              </div>
              <div className="form-actions">
                <Button
                  type="submit"
                  className="btn--pill"
                  arrow
                  disabled={!jd.trim()}
                >
                  Begin interview
                </Button>
              </div>
            </form>
          </Card>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default InterviewPage;
