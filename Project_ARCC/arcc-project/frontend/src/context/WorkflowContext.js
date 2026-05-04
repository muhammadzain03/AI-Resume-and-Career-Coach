import React, { createContext, useContext, useMemo, useState } from "react";

const WorkflowContext = createContext(null);

export function WorkflowProvider({ children }) {
  const [resumeUpload, setResumeUpload] = useState({
    status: "idle",
    fileName: "",
    parsedData: null,
    uploadedAt: null,
  });
  const [jobDetails, setJobDetails] = useState({
    jobTitle: "",
    description: "",
  });

  const [analysisId, setAnalysisId] = useState(null);

  const setResumeUploadResult = ({ fileName, parsedData }) => {
    setResumeUpload({
      status: "success",
      fileName,
      parsedData: parsedData || null,
      uploadedAt: new Date().toISOString(),
    });
  };

  const clearResumeUpload = () => {
    setResumeUpload({
      status: "idle",
      fileName: "",
      parsedData: null,
      uploadedAt: null,
    });
  };

  const value = useMemo(
    () => ({
      resumeUpload,
      setResumeUploadResult,
      clearResumeUpload,
      jobDetails,
      setJobDetails,
      analysisId,
      setAnalysisId,
    }),
    [resumeUpload, jobDetails, analysisId],
  );

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used inside WorkflowProvider.");
  }
  return context;
}
