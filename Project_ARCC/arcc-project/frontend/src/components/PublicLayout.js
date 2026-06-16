import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import RCCLogo from "./RCCLogo";
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
      <nav className="floating-nav">
        <NavLink to="/" className="floating-nav__logo" end>
          <RCCLogo size={28} showWordmark={false} />
        </NavLink>

        <div className="floating-nav__links">
          <NavLink to="/" end>Home</NavLink>
          {!isAuthenticated && (
            <NavLink to="/login">Sign In</NavLink>
          )}
        </div>

        <div className="floating-nav__right">
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <span className="theme-toggle__track" aria-hidden="true">
              <span className="theme-toggle__thumb" />
            </span>
          </button>

          {isAuthenticated && (
            <Link to="/app" className="nav-avatar" title="Dashboard">
              <span className="nav-avatar__initials">
                {getInitials(user?.name || user?.email)}
              </span>
            </Link>
          )}
        </div>
      </nav>

      <main className="public-content">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};

export default PublicLayout;
