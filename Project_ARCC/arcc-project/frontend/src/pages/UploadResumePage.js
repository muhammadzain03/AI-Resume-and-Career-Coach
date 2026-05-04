import React from "react";
import ResumeUploader from "../components/ResumeUploader";
import { useWorkflow } from "../context/WorkflowContext";

const UploadResumePage = () => {
  const { resumeUpload } = useWorkflow();

  return (
    <div className="page">
      <p className="eyebrow">Step 1</p>
      <h1>Upload Your Resume</h1>
      <p className="page-intro">Upload your resume in PDF or DOCX format for analysis and tailored feedback.</p>
      {resumeUpload.status === "success" ? (
        <div className="status-banner" role="status">
          Last uploaded file: <strong>{resumeUpload.fileName}</strong>
        </div>
      ) : null}
      <ResumeUploader />
    </div>
  );
};

export default UploadResumePage;
