const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch(`${API_BASE}/resume/upload`, {
    method: "POST",
    body: formData,
  });

  return handleResponse(response);
}

export async function runAnalysis(resumeId, jobDescription, userId = null) {
  const response = await fetch(`${API_BASE}/analysis/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription, user_id: userId }),
  });
  return handleResponse(response);
}

export async function getAnalysis(analysisId) {
  const response = await fetch(`${API_BASE}/analysis/${analysisId}`);
  return handleResponse(response);
}

export async function getHistory(userId = null, limit = 20) {
  const params = new URLSearchParams({ user_id: userId, limit });
  const response = await fetch(`${API_BASE}/analysis/history?${params}`);
  return handleResponse(response);
}

export async function startInterview(jobDescription, role = "") {
  const response = await fetch(`${API_BASE}/interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_description: jobDescription, role }),
  });
  return handleResponse(response);
}

export async function submitAnswer(sessionId, answer) {
  const response = await fetch(`${API_BASE}/interview/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
  return handleResponse(response);
}

export async function endInterview(sessionId) {
  const response = await fetch(`${API_BASE}/interview/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  return handleResponse(response);
}