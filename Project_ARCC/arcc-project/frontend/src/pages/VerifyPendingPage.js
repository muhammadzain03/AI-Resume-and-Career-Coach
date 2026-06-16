import React from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

const VerifyPendingPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Check your email</h1>
        <p className="auth-card__sub">
          We sent a verification link to{" "}
          <strong>{user?.email || "your inbox"}</strong>. Open it to activate
          your account before using the dashboard.
        </p>
        <p className="muted" style={{ marginTop: "1rem" }}>
          If SMTP is not configured, the verification URL is printed in the
          backend server logs.
        </p>
        <Button type="button" className="auth-submit-btn" onClick={logout}>
          Sign out
        </Button>
        <p className="auth-card__footer">
          Already verified? <Link to="/login">Sign in again</Link>
        </p>
      </Card>
    </div>
  );
};

export default VerifyPendingPage;
