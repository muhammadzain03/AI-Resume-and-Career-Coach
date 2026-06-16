import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import Footer from "./Footer";
import { useAuth } from "../context/AuthContext";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

const PublicLayout = ({ theme, onToggleTheme }) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="public-layout">
      <header className="site-header">
        <nav className="site-nav" aria-label="Main">
          <div className="site-nav__inner">
            <NavLink to="/" className="site-nav__brand" end>
              <span className="site-nav__mark" aria-hidden="true">
                R
              </span>
              RCC
            </NavLink>

            <div className="site-nav__links">
              <NavLink to="/" end>
                Home
              </NavLink>
              <a href="/#features">Features</a>
              <a href="/#how-it-works">How it works</a>
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
    </div>
  );
};

export default PublicLayout;
