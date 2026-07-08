import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Button from "./Button";

const CONTACT_EMAIL = "arcc.resume@gmail.com";

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Privacy", href: "/#faq-privacy" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", contact: true },
      { label: "Terms", href: "/terms", internal: true },
    ],
  },
];

const ContactPopover = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
      clearTimeout(copyTimer.current);
    };
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
    } catch {
      // Clipboard API unavailable (http / old browser) - fall back to a
      // temporary input + execCommand copy.
      const el = document.createElement("input");
      el.value = CONTACT_EMAIL;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(el);
      }
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="contact-popover" ref={popoverRef} role="dialog" aria-label="Contact email">
      <span className="contact-popover__glow" aria-hidden="true" />
      <div className="contact-popover__head">
        <span className="contact-popover__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </span>
        <span className="contact-popover__title">Get in touch</span>
        <button
          type="button"
          className="contact-popover__close"
          onClick={onClose}
          aria-label="Close contact popup"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <p className="contact-popover__sub">
        Questions, feedback, or a bug to report - we read everything.
      </p>

      <div className="contact-popover__row">
        <a className="contact-popover__email" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        <button
          type="button"
          className={`contact-popover__copy${copied ? " is-copied" : ""}`}
          onClick={handleCopy}
          aria-label={copied ? "Email copied" : "Copy email to clipboard"}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
};

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [contactOpen, setContactOpen] = useState(false);

  // The big closing CTA only belongs on the marketing homepage. On auth and
  // utility pages (/login, /signup, /verify-*) "Get started free" just routes
  // to the page you're already on, so it's noise - show a slim footer instead.
  const showCta = location.pathname === "/";

  return (
    <footer className="site-footer">
      {showCta && (
        <div className="site-footer__cta">
          <h2 className="site-footer__title">
            Stop guessing. Start <span className="home-mark">landing</span>.
          </h2>
          <p className="site-footer__sub">
            Score your resume against the job you want - in under a minute.
          </p>
          <Button
            className="btn--pill btn--hero"
            arrow
            onClick={() => navigate("/signup")}
          >
            Get started free
          </Button>
        </div>
      )}

      <div className="site-footer__cols">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="site-footer__col">
            <h3 className="site-footer__col-title">{column.title}</h3>
            <ul className="site-footer__links">
              {column.links.map((link) =>
                link.contact ? (
                  <li key={link.label}>
                    <span className="site-footer__contact-wrap">
                      <button
                        type="button"
                        className="site-footer__contact-btn"
                        onClick={() => setContactOpen((open) => !open)}
                        aria-expanded={contactOpen}
                        aria-haspopup="dialog"
                      >
                        {link.label}
                      </button>
                      {contactOpen && (
                        <ContactPopover onClose={() => setContactOpen(false)} />
                      )}
                    </span>
                  </li>
                ) : link.internal ? (
                  <li key={link.label}>
                    <Link to={link.href}>{link.label}</Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </div>

      <p className="site-footer__copy">
        &copy; 2026 RCC. Built by Muhammad Zain.
      </p>
    </footer>
  );
};

export default Footer;
