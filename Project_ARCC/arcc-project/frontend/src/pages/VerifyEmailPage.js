import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { verifyEmail } from "../services/api";

const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    (async () => {
      try {
        const data = await verifyEmail(token);
        setStatus("success");
        setMessage(data.message || "Email verified successfully.");
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Verification failed.");
      }
    })();
  }, [params]);

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h1>Email verification</h1>
        {status === "loading" && <p className="auth-card__sub">Verifying your email...</p>}
        {status !== "loading" && (
          <p className={`auth-card__sub status-text status-text--${status === "success" ? "success" : "error"}`}>
            {message}
          </p>
        )}
        {status === "success" && (
          <Button onClick={() => navigate("/login")} className="auth-submit-btn">
            Sign In
          </Button>
        )}
        {status === "error" && (
          <p className="auth-card__footer">
            <Link to="/signup">Back to Sign Up</Link>
          </p>
        )}
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
