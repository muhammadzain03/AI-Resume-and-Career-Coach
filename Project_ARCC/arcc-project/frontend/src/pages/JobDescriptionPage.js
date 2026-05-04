import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import { useWorkflow } from "../context/WorkflowContext";
import { validateRequiredText } from "../utils/validation";
import { runAnalysis } from "../services/api";

const JobDescriptionPage = () => {
  const { resumeUpload, jobDetails, setJobDetails } = useWorkflow();
  const [jobTitle, setJobTitle] = useState(jobDetails.jobTitle || "");
  const [description, setDescription] = useState(jobDetails.description || "");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const nextErrors = {
      jobTitle: validateRequiredText(jobTitle, "Job title", 2),
      description: validateRequiredText(description, "Job description", 20),
    };

    const hasErrors = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    if (hasErrors) {
      setMessage("");
      return;
    }

    if (!resumeUpload?.resumeId && !localStorage.getItem("resume_id")) {
      setMessage("Please upload a resume first.");
      return;
    }

    const resumeId = resumeUpload?.resumeId || localStorage.getItem("resume_id");

    try {
      const analysisResult = await runAnalysis(resumeId, description, null);
      const analysisId = analysisResult?.analysis_id || analysisResult?.data?.analysis_id;
      if (!analysisId) throw new Error("No analysis ID returned from server");

      setJobDetails({ jobTitle: jobTitle.trim(), description: description.trim(), analysisId });
      setMessage("Analysis started. Redirecting to results...");

      navigate(`/results/${analysisId}`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to start analysis. Please try again.");
    }
  };

  return (
    <div className="page">
      <p className="eyebrow">Step 2</p>
      <h1>Job Description</h1>
      <Card className="feature-card">
        <h2>Enter Job Details</h2>
        {resumeUpload.status !== "success" && !localStorage.getItem("resume_id") && (
          <p className="status-text status-text--warning">
            Upload a resume first for the best match and suggestions.
          </p>
        )}
        <p className="page-intro">
          Paste the role title and description so ARCC can tailor resume feedback to the job.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <Input
            id="job-title"
            name="jobTitle"
            label="Job Title"
            placeholder="Job Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
            ariaInvalid={Boolean(errors.jobTitle)}
            ariaDescribedBy={errors.jobTitle ? "job-title-error" : undefined}
          />
          {errors.jobTitle && (
            <p className="field-error" id="job-title-error" role="alert">
              {errors.jobTitle}
            </p>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="job-description">
              Job Description
            </label>
            <textarea
              id="job-description"
              name="description"
              className="textarea"
              placeholder="Job Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="10"
              required
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "job-description-error" : undefined}
            />
          </div>
          {errors.description && (
            <p className="field-error" id="job-description-error" role="alert">
              {errors.description}
            </p>
          )}

          <div className="form-actions">
            <Button type="submit">Submit</Button>
          </div>
        </form>

        {message && (
          <p className="status-text status-text--info" role="status">
            {message}
          </p>
        )}
      </Card>
    </div>
  );
};

export default JobDescriptionPage;