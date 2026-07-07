import React, { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Card from "../components/Card";
import Button from "../components/Button";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../context/AuthContext";
import { toUserMessage } from "../utils/errors";

const RESEND_COOLDOWN_S = 30;

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, googleLogin, verifyCode, resendCode } = useAuth();

  const startOnSignup =
    location.pathname === "/signup" || location.state?.tab === "signup";
  const [mode, setMode] = useState(startOnSignup ? "signup" : "login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Email-code verification step. When pendingEmail is set the card switches
  // to "enter the 6-digit code" mode until the code checks out.
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");
  const [resendLeft, setResendLeft] = useState(0);
  const resendTimer = useRef(null);

  const redirectTo = location.state?.from || "/app";

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  const startResendCooldown = () => {
    setResendLeft(RESEND_COOLDOWN_S);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendLeft((s) => {
        if (s <= 1) {
          clearInterval(resendTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const enterVerification = (pendingFor, message) => {
    setPendingEmail(pendingFor);
    setCode("");
    setError("");
    setInfo(message || `We sent a 6-digit code to ${pendingFor}.`);
    startResendCooldown();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await login(email, password);
      if (data.verification_required) {
        enterVerification(data.email || email, data.message);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.status === 403 && err.data?.verification_required) {
        enterVerification(err.data.email || email, err.data.message);
        return;
      }
      setError(toUserMessage(err) || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await signup(name, email, password);
      if (data.verification_required) {
        enterVerification(data.email || email, data.message);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(toUserMessage(err) || "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credential) => {
    setError("");
    setSubmitting(true);
    try {
      const data = await googleLogin(credential);
      if (data.verification_required) {
        enterVerification(data.email, data.message);
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(toUserMessage(err) || "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await verifyCode(pendingEmail, code.trim());
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(toUserMessage(err) || "Verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendLeft > 0 || submitting) return;
    setError("");
    try {
      await resendCode(pendingEmail);
      setInfo(`A new code is on its way to ${pendingEmail}.`);
      startResendCooldown();
    } catch (err) {
      setError(toUserMessage(err) || "Could not resend the code.");
    }
  };

  const exitVerification = () => {
    setPendingEmail("");
    setCode("");
    setInfo("");
    setError("");
    clearInterval(resendTimer.current);
    setResendLeft(0);
  };

  const isLogin = mode === "login";
  const verifying = Boolean(pendingEmail);

  return (
    <div className="auth-page">
      <motion.div
        key={verifying ? "verify" : mode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="auth-card">
          {verifying ? (
            <>
              <span className="auth-verify__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </span>
              <h2 className="auth-verify__title">Check your email</h2>
              <p className="auth-card__sub">
                {info || `We sent a 6-digit code to ${pendingEmail}.`}
              </p>

              <form onSubmit={handleVerify}>
                <div className="input-group">
                  <label className="input-label" htmlFor="auth-code">
                    Verification code
                  </label>
                  <input
                    id="auth-code"
                    className="input auth-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    autoFocus
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <p className="status-text status-text--error">{error}</p>
                )}

                <Button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={submitting || code.length !== 6}
                >
                  {submitting ? "Verifying..." : "Verify and continue"}
                </Button>
              </form>

              <div className="auth-verify__footer">
                <button
                  type="button"
                  className="auth-verify__link"
                  onClick={handleResend}
                  disabled={resendLeft > 0 || submitting}
                >
                  {resendLeft > 0
                    ? `Resend code in ${resendLeft}s`
                    : "Resend code"}
                </button>
                <button
                  type="button"
                  className="auth-verify__link"
                  onClick={exitVerification}
                  disabled={submitting}
                >
                  Use a different account
                </button>
              </div>
            </>
          ) : (
            <>
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
                onError={(err) => setError(toUserMessage(err) || "Google sign-in failed.")}
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
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthPage;
