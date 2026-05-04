import React, { useState } from "react";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import InterviewChat from "../components/InterviewChat";
import { useWorkflow } from "../context/WorkflowContext";

const InterviewPage = () => {
  const { jobDetails } = useWorkflow();
  const [started, setStarted] = useState(false);
  const [jd, setJd] = useState(jobDetails.description || "");
  const [role, setRole] = useState(jobDetails.jobTitle || "");

  const handleStart = (e) => {
    e.preventDefault();
    if (jd.trim()) setStarted(true);
  };

  if (started) {
    return <InterviewChat jobDescription={jd} role={role} />;
  }

  return (
    <div className="page">
      <p className="eyebrow">Step 4</p>
      <h1>Interview Practice</h1>
      <div className="info-grid">
        <Card className="info-card">
          <h2>Behavioral Prep</h2>
          <p>Practice structured stories about teamwork, problem-solving, and ownership.</p>
        </Card>
        <Card className="info-card">
          <h2>Role Questions</h2>
          <p>Focus on prompts that connect directly to the job description you entered.</p>
        </Card>
      </div>
      <Card className="feature-card">
        <h2>Start an Interview Session</h2>
        <p>Paste or reuse a job description to generate tailored interview questions.</p>
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
    </div>
  );
};

export default InterviewPage;
