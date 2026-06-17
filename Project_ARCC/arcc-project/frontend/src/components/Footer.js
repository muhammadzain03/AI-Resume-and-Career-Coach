import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "./Button";

const DOCS_URL =
  "https://github.com/muhammadzain03/AI-Resume-and-Career-Coach/blob/main/Project_ARCC/arcc-project/docs/RCC-Project-Documentation.md";

const API_DOCS_URL = `${DOCS_URL}#api-contract`;

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
      { label: "API docs", href: API_DOCS_URL, external: true },
    ],
  },
  {
    title: "Support",
    links: [
      {
        label: "Contact",
        href: "https://github.com/muhammadzain03/AI-Resume-and-Career-Coach/issues",
        external: true,
      },
      { label: "Privacy", href: "/#faq-privacy" },
      { label: "Terms", href: DOCS_URL, external: true },
    ],
  },
];

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="site-footer">
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

      <div className="site-footer__cols">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="site-footer__col">
            <h3 className="site-footer__col-title">{column.title}</h3>
            <ul className="site-footer__links">
              {column.links.map((link) => (
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
              ))}
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
