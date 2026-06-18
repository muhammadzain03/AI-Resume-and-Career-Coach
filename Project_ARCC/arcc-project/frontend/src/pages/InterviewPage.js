import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import InterviewChat from "../components/InterviewChat";
import ScrollReveal from "../components/ScrollReveal";
import { uploadResume } from "../services/api";
import { validateResumeFile } from "../utils/validation";

const EXPECTATIONS = [
  "Role-specific behavioral and technical questions",
  "Personalized to your background, not generic",
  "Real-time feedback after every answer",
  "An overall score and tips at the end",
];

const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const InterviewPage = () => {
  const location = useLocation();
  const initialJd = location.state?.jd || "";
  const initialResumeId = location.state?.resumeId || null;

  const [started, setStarted] = useState(false);
  const [jd, setJd] = useState(initialJd);
  const [role, setRole] = useState("");
  const [resumeId, setResumeId] = useState(initialResumeId);
  const [contextName, setContextName] = useState(
    initialResumeId ? "Your analyzed resume" : ""
  );
  const [uploadingContext, setUploadingContext] = useState(false);
  const [contextError, setContextError] = useState("");

  const handleContextFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const validationError = validateResumeFile(f);
    if (validationError) {
      setContextError(validationError);
      return;
    }
    setContextError("");
    setUploadingContext(true);
    try {
      const res = await uploadResume(f);
      const id = res?.resume_id;
      if (!id) throw new Error("Upload failed.");
      setResumeId(id);
      setContextName(f.name);
    } catch (err) {
      setContextError(
        err?.message ||
          "Couldn't read that file. Try a text-based PDF or DOCX."
      );
    } finally {
      setUploadingContext(false);
    }
  };

  const handleStart = (e) => {
    e.preventDefault();
    if (jd.trim()) setStarted(true);
  };

  if (started) {
    return <InterviewChat jobDescription={jd} role={role} resumeId={resumeId} />;
  }

  return (
    <div className="page interview-setup">
      <ScrollReveal>
        <p className="eyebrow">Interview</p>
        <h1>Interview practice</h1>
        <p className="page-intro">
          Rehearse with an AI interviewer that adapts to the role you paste and
          the background you share. Speak or type your answers and get feedback
          after every one.
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
                  rows="6"
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">
                  Personal context (optional)
                </label>
                <label className="context-upload" htmlFor="interview-context">
                  <span className="context-upload__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </span>
                  <span className="context-upload__text">
                    {uploadingContext
                      ? "Reading file…"
                      : contextName
                      ? contextName
                      : "Add your resume or a personal doc — PDF/DOCX"}
                  </span>
                  {uploadingContext && <Spinner size={16} />}
                  <input
                    id="interview-context"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleContextFile}
                    disabled={uploadingContext}
                  />
                </label>
                <p className="context-upload__hint">
                  Used to ask questions about your real experience and projects.
                </p>
                {contextError && (
                  <p className="status-text status-text--error">{contextError}</p>
                )}
              </div>

              <div className="form-actions">
                <Button
                  type="submit"
                  className="btn--pill"
                  arrow
                  disabled={!jd.trim() || uploadingContext}
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
