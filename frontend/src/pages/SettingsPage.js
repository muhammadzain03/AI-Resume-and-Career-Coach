import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScrollReveal from "../components/ScrollReveal";
import Card from "../components/Card";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { toUserMessage } from "../utils/errors";

const CONFIRM_WORD = "DELETE";

function getInitials(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2 && /[a-zA-Z]/.test(parts[0])) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return nameOrEmail.slice(0, 2).toUpperCase();
}

const DeleteAccountModal = ({ onClose, onDeleted }) => {
  const { deleteAccount } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const canDelete = confirmText.trim() === CONFIRM_WORD && !deleting;

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleDelete = async () => {
    if (!canDelete) return;
    setError("");
    setDeleting(true);
    try {
      await deleteAccount();
      onDeleted();
    } catch (err) {
      setError(toUserMessage(err));
      setDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal--danger"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        <span className="modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>

        <h2 id="delete-account-title" className="modal__title">
          Delete your account?
        </h2>
        <p className="modal__text">
          This permanently deletes your account along with every resume,
          analysis, and interview session you&apos;ve created. This action
          cannot be undone.
        </p>

        <label className="modal__label" htmlFor="delete-confirm-input">
          Type <strong>{CONFIRM_WORD}</strong> to confirm
        </label>
        <input
          id="delete-confirm-input"
          ref={inputRef}
          className="modal__input"
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleDelete();
          }}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          spellCheck="false"
        />

        {error && <p className="status-text status-text--error">{error}</p>}

        <div className="modal__actions">
          <button
            type="button"
            className="modal__btn modal__btn--ghost"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal__btn modal__btn--danger"
            onClick={handleDelete}
            disabled={!canDelete}
          >
            {deleting ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const displayName = user?.name || user?.email || "";

  return (
    <div className="page">
      <ScrollReveal>
        <p className="eyebrow">Settings</p>
        <h1 className="dash-greeting__title">Account</h1>
        <p className="page-intro">
          Manage your RCC account and data.
        </p>
      </ScrollReveal>

      <ScrollReveal>
        <Card className="settings-card">
          <h2 className="settings-card__title">Profile</h2>
          <div className="settings-profile">
            <span className="settings-profile__avatar" aria-hidden="true">
              {getInitials(displayName)}
            </span>
            <div className="settings-profile__meta">
              <span className="settings-profile__name">
                {user?.name || "—"}
              </span>
              <span className="settings-profile__email">{user?.email}</span>
            </div>
          </div>
        </Card>
      </ScrollReveal>

      <ScrollReveal>
        <Card className="settings-card settings-card--danger">
          <h2 className="settings-card__title settings-card__title--danger">
            Danger zone
          </h2>
          <div className="settings-danger">
            <div className="settings-danger__copy">
              <span className="settings-danger__label">Delete account</span>
              <p className="settings-danger__desc">
                Permanently remove your account, resumes, analyses, and
                interview history. This cannot be undone.
              </p>
            </div>
            <Button
              className="btn--danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete account
            </Button>
          </div>
        </Card>
      </ScrollReveal>

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={() => navigate("/", { replace: true })}
        />
      )}
    </div>
  );
};

export default SettingsPage;
