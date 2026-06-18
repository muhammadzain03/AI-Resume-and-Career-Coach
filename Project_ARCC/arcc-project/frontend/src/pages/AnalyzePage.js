import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";
import Button from "../components/Button";
import Spinner from "../components/Spinner";
import AnalysisResults from "../components/AnalysisResults";
import { uploadResume, runAnalysis, getAnalysis } from "../services/api";
import { validateResumeFile } from "../utils/validation";

const PARSE_ERROR_MESSAGE =
  "That file wouldn't parse. Try a text-based PDF or a DOCX - scanned images won't work.";

function getAnalyzeErrorMessage(err) {
  const msg = (err?.message || "").toLowerCase();
  if (
    msg.includes("parse") ||
    msg.includes("extract") ||
    msg.includes("text-based")
  ) {
    return PARSE_ERROR_MESSAGE;
  }
  return err?.message || "Something went wrong. Please try again.";
}

const AnalyzePage = () => {
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const resultsRef = useRef(null);

  const busy = uploading || analyzing;

  const acceptFile = (f) => {
    if (!f) return;
    const validationError = validateResumeFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  };

  const handleFileChange = (e) => acceptFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!busy) setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a resume file.");
      return;
    }
    if (!description.trim() || description.trim().length < 20) {
      setError("Please enter a job description (at least 20 characters).");
      return;
    }

    setError("");
    setResults(null);
    setUploading(true);
    setProgress("Uploading resume...");

    try {
      const uploadResult = await uploadResume(file);
      const newResumeId = uploadResult?.resume_id || uploadResult?.data?.resume_id;
      if (!newResumeId) throw new Error("Upload failed - no resume ID returned.");
      setResumeId(newResumeId);
      localStorage.setItem("resume_id", newResumeId);

      setUploading(false);
      setAnalyzing(true);
      setProgress("Reading your resume the way an ATS would...");

      const analysisResult = await runAnalysis(newResumeId, description.trim());
      const analysisId =
        analysisResult?.analysis_id || analysisResult?.data?.analysis_id;
      if (!analysisId)
        throw new Error("Analysis failed - no analysis ID returned.");

      setProgress("Scoring against the job description...");
      const data = await getAnalysis(analysisId);
      setResults(data);
      setProgress("");

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 200);
    } catch (err) {
      setError(getAnalyzeErrorMessage(err));
      setProgress("");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="analyze-page">
      <ScrollReveal>
        <p className="eyebrow">Analyze</p>
        <h1>Resume analysis</h1>
        <p className="page-intro">
          Upload your resume and a job description to get an instant match
          score, skill gaps, and improvement suggestions.
        </p>
      </ScrollReveal>

      <div className="analyze-form">
        <ScrollReveal delay={0.1} className="analyze-col">
          <Card className="analyze-card">
            <div className="analyze-card__head">
              <span className="step-badge">1</span>
              <div>
                <h2>Upload resume</h2>
                <p className="analyze-card__hint">PDF or DOCX, up to 4 MB</p>
              </div>
            </div>
            <label
              className={`dropzone${dragging ? " dropzone--active" : ""}${
                file ? " dropzone--filled" : ""
              }`}
              htmlFor="analyze-resume"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <span className="dropzone__icon" aria-hidden="true">
                {file ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </span>
              {file ? (
                <span className="dropzone__file">{file.name}</span>
              ) : (
                <>
                  <span className="dropzone__title">
                    {dragging ? "Drop to upload" : "Drop your resume here"}
                  </span>
                  <span className="dropzone__hint">
                    or click to browse · PDF, DOCX
                  </span>
                </>
              )}
              <input
                id="analyze-resume"
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileChange}
                disabled={busy}
              />
            </label>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.2} className="analyze-col">
          <Card className="analyze-card">
            <div className="analyze-card__head">
              <span className="step-badge">2</span>
              <div>
                <h2>Job description</h2>
                <p className="analyze-card__hint">
                  Paste the role you&apos;re targeting
                </p>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyze-title">
                Job Title
              </label>
              <input
                id="analyze-title"
                className="input"
                placeholder="e.g. Software Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="analyze-jd">
                Description
              </label>
              <textarea
                id="analyze-jd"
                className="textarea"
                placeholder="Paste the full job description here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="6"
                disabled={busy}
              />
            </div>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.3} className="analyze-form__actions">
          <div className="analyze-actions">
            {busy ? (
              <div className="analyze-progress">
                <Spinner size={26} />
                <span className="analyze-progress__text">
                  {progress || "Working..."}
                </span>
              </div>
            ) : (
              <Button
                onClick={handleAnalyze}
                disabled={!file}
                arrow
                className="btn--pill"
              >
                Analyze Resume
              </Button>
            )}
            {error && <p className="status-text status-text--error">{error}</p>}
          </div>
        </ScrollReveal>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div
            ref={resultsRef}
            className="analyze-results"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="analyze-results__divider" />
            <h2 className="analyze-results__heading">Results</h2>
            <AnalysisResults
              results={results}
              jobDescription={description}
              resumeId={resumeId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalyzePage;
