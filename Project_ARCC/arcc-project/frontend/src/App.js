import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import VerifyPendingPage from "./pages/VerifyPendingPage";
import OverviewPage from "./pages/OverviewPage";
import AnalyzePage from "./pages/AnalyzePage";
import InterviewPage from "./pages/InterviewPage";
import HistoryPage from "./pages/HistoryPage";
import "./styles/main.css";

const THEME_STORAGE_KEY = "rcc-theme";

function App() {
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
    try {
      return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <Routes>
      <Route path="/upload" element={<Navigate to="/app/analyze" replace />} />
      <Route path="/job" element={<Navigate to="/app/analyze" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route path="/interview" element={<Navigate to="/app/interview" replace />} />

      <Route
        element={<PublicLayout theme={theme} onToggleTheme={toggleTheme} />}
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-pending" element={<VerifyPendingPage />} />
      </Route>

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout theme={theme} onToggleTheme={toggleTheme} />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="analyze" element={<AnalyzePage />} />
        <Route path="interview" element={<InterviewPage />} />
        <Route path="history" element={<HistoryPage />} />
      </Route>
    </Routes>
  );
}

export default App;
