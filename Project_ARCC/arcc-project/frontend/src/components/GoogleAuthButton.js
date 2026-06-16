import React, { useEffect, useRef } from "react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const GoogleAuthButton = ({ onSuccess, onError, disabled, label = "Continue with Google" }) => {
  const btnRef = useRef(null);
  const callbackRef = useRef(onSuccess);

  useEffect(() => {
    callbackRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !btnRef.current) return;

    const handleCredential = (response) => {
      if (response?.credential) {
        callbackRef.current?.(response.credential);
      } else {
        onError?.(new Error("Google sign-in failed"));
      }
    };

    const renderButton = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 320,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", renderButton);
      return () => existing.removeEventListener("load", renderButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    document.body.appendChild(script);
  }, [onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <button type="button" className="auth-google-btn" disabled>
        {label} (not configured)
      </button>
    );
  }

  return (
    <div
      className={`auth-google-wrap${disabled ? " auth-google-wrap--disabled" : ""}`}
      ref={btnRef}
      aria-hidden={disabled}
    />
  );
};

export default GoogleAuthButton;
