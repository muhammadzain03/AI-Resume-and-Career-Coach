import React, { useState } from "react";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import InterviewChat from "../components/InterviewChat";
import ScrollReveal from "../components/ScrollReveal";

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
    <div className="page">
      <ScrollReveal>
        <p className="eyebrow">Interview</p>
        <h1>Interview Practice</h1>
      </ScrollReveal>

      <div className="info-grid">
        <ScrollReveal delay={0.1}>
          <Card className="info-card">
            <h2>Behavioral Prep</h2>
            <p>
              Practice structured stories about teamwork, problem-solving,
              and ownership.
            </p>
          </Card>
        </ScrollReveal>
        <ScrollReveal delay={0.2}>
          <Card className="info-card">
            <h2>Role Questions</h2>
            <p>
              Focus on prompts that connect directly to the job description
              you entered.
            </p>
          </Card>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={0.25}>
        <Card className="feature-card">
          <h2>Start an Interview Session</h2>
          <p>
            Paste or reuse a job description to generate tailored interview
            questions.
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
                rows="6"
                required
              />
            </div>
            <div className="form-actions">
              <Button type="submit" disabled={!jd.trim()}>
                Begin Interview
              </Button>
            </div>
          </form>
        </Card>
      </ScrollReveal>
    </div>
  );
};

export default InterviewPage;
