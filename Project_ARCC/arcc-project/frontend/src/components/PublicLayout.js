import React, { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import Footer from "./Footer";
import BackToTop from "./BackToTop";
import { useAuth } from "../context/AuthContext";

const SCROLLSPY_SECTION_IDS = [
  "features",
  "how-it-works",
  "pricing",
  "faq",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function sectionLinkClass(activeId, id) {
  return activeId === id ? "active" : undefined;
}

const PublicLayout = ({ theme, onToggleTheme }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveId("");
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    SCROLLSPY_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div className="public-layout">
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <nav className="site-nav" aria-label="Main">
          <div className="site-nav__inner">
            <NavLink to="/" className="site-nav__brand" end>
              <span className="site-nav__mark" aria-hidden="true">
                R
              </span>
              RCC
            </NavLink>

            <div className="site-nav__links">
              <a
                href="/#features"
                className={sectionLinkClass(activeId, "features")}
              >
                Features
              </a>
              <a
                href="/#how-it-works"
                className={sectionLinkClass(activeId, "how-it-works")}
              >
                How it works
              </a>
              <a
                href="/#pricing"
                className={sectionLinkClass(activeId, "pricing")}
              >
                Pricing
              </a>
              <a href="/#faq" className={sectionLinkClass(activeId, "faq")}>
                FAQ
              </a>
            </div>

            <div className="site-nav__actions">
              <button
                type="button"
                className="theme-toggle theme-toggle--compact"
                onClick={onToggleTheme}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                <span className="theme-toggle__track" aria-hidden="true">
                  <span className="theme-toggle__thumb" />
                </span>
              </button>

              {isAuthenticated ? (
                <Link to="/app" className="site-nav__cta" title="Dashboard">
                  <span className="nav-avatar__initials">
                    {getInitials(user?.name || user?.email)}
                  </span>
                  Dashboard
                </Link>
              ) : (
                <NavLink to="/login" className="site-nav__cta">
                  Sign in
                </NavLink>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="public-content">
        <Outlet />
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
};

export default PublicLayout;
