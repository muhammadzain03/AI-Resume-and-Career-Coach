import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Card from "../components/Card";
import Button from "../components/Button";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../context/AuthContext";

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, googleLogin } = useAuth();

  const startOnSignup =
    location.pathname === "/signup" || location.state?.tab === "signup";
  const [mode, setMode] = useState(startOnSignup ? "signup" : "login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from || "/app";

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await login(email, password);
      if (!data.user?.email_verified) {
        navigate("/verify-pending", { replace: true });
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.status === 403) {
        navigate("/verify-pending", { replace: true });
        return;
      }
      setError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const data = await signup(name, email, password);
      setMessage(
        data.message ||
          "Account created. Check your email for a verification link."
      );
      navigate("/verify-pending", { replace: true });
    } catch (err) {
      setError(err.message || "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError("");
    setSubmitting(true);
    try {
      await googleLogin(credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLogin = mode === "login";

  return (
    <div className="auth-page">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${isLogin ? "auth-tab--active" : ""}`}
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${!isLogin ? "auth-tab--active" : ""}`}
              onClick={() => switchMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <p className="auth-card__sub">
            {isLogin
              ? "Welcome back to RCC"
              : "Get started with RCC for free"}
          </p>

          <GoogleAuthButton
            onSuccess={handleGoogle}
            onError={(err) => setError(err.message)}
            disabled={submitting}
            label={isLogin ? "Continue with Google" : "Sign up with Google"}
          />

          <div className="auth-separator">
            <span className="auth-separator__line" />
            <span className="auth-separator__text">or</span>
            <span className="auth-separator__line" />
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignup}>
            {!isLogin && (
              <div className="input-group">
                <label className="input-label" htmlFor="auth-name">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            )}
            <div className="input-group">
              <label className="input-label" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                className="input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                className="input"
                type="password"
                placeholder={isLogin ? "Password" : "At least 8 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isLogin ? undefined : 8}
                disabled={submitting}
              />
            </div>

            {error && (
              <p className="status-text status-text--error">{error}</p>
            )}
            {message && (
              <p className="status-text status-text--success">{message}</p>
            )}

            <Button
              type="submit"
              className="auth-submit-btn"
              disabled={submitting}
            >
              {submitting
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;
