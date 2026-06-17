const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

const ACCESS_KEY = "rcc_access_token";
const REFRESH_KEY = "rcc_refresh_token";
const USER_KEY = "rcc_user";

const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Make sure the backend is running on " +
  `${API_BASE.replace(/\/api$/, "")} and try again.`;

// fetch() rejects with a TypeError on network-level failures (server down,
// CORS, DNS). Translate that into an actionable message instead of the
// browser's opaque "Failed to fetch".
async function doFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const netErr = new Error(NETWORK_ERROR_MESSAGE);
    netErr.status = 0;
    netErr.cause = err;
    throw netErr;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession({ access_token, refresh_token, user }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_KEY, refresh_token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  const response = await doFetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { Authorization: `Bearer ${refresh}` },
  });

  if (!response.ok) {
    clearAuthSession();
    return false;
  }

  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem(ACCESS_KEY, data.access_token);
    return true;
  }
  return false;
}

export async function authFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response = await doFetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getAccessToken()}`;
      response = await doFetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  return parseResponse(response);
}

export async function registerUser(name, email, password) {
  const data = await authFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  setAuthSession(data);
  return data;
}

export async function loginUser(email, password) {
  const response = await doFetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponse(response);
  setAuthSession(data);
  return data;
}

export async function googleAuth(credential) {
  const data = await authFetch("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  setAuthSession(data);
  return data;
}

export async function getMe() {
  return authFetch("/auth/me");
}

export async function verifyEmail(token) {
  const response = await doFetch(
    `${API_BASE}/auth/verify/${encodeURIComponent(token)}`
  );
  return parseResponse(response);
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("resume", file);
  return authFetch("/resume/upload", { method: "POST", body: formData });
}

export async function runAnalysis(resumeId, jobDescription) {
  return authFetch("/analysis/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume_id: resumeId, job_description: jobDescription }),
  });
}

export async function getAnalysis(analysisId) {
  return authFetch(`/analysis/${analysisId}`);
}

export async function getHistory(limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  return authFetch(`/analysis/history?${params}`);
}

export async function startInterview(jobDescription, role = "") {
  return authFetch("/interview/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_description: jobDescription, role }),
  });
}

export async function submitAnswer(sessionId, answer) {
  return authFetch("/interview/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
}

export async function endInterview(sessionId) {
  return authFetch("/interview/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function getInterviewHistory(limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  return authFetch(`/interview/history?${params}`);
}

export async function getInterviewSession(sessionId) {
  return authFetch(`/interview/${encodeURIComponent(sessionId)}`);
}
