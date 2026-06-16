import React, { useState } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import RCCLogo from "./RCCLogo";
import { useAuth } from "../context/AuthContext";

const menuItems = [
  { to: "/app", label: "Overview", icon: "grid", end: true },
  { to: "/app/analyze", label: "Analyze", icon: "search" },
  { to: "/app/interview", label: "Interview", icon: "mic" },
  { to: "/app/history", label: "History", icon: "clock" },
];

const icons = {
  grid: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

const DashboardLayout = ({ theme, onToggleTheme }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`dash-layout${collapsed ? " dash-layout--collapsed" : ""}`}>
      <aside className="dash-sidebar">
        <Link to="/" className="dash-sidebar__header dash-sidebar__home-link">
          <RCCLogo size={28} showWordmark={!collapsed} />
        </Link>

        <nav className="dash-sidebar__nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="dash-sidebar__link"
            >
              {icons[item.icon]}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar__footer">
          {!collapsed && user && (
            <div className="dash-sidebar__user">
              <span className="dash-sidebar__user-name">
                {user.name || user.email}
              </span>
              <button
                type="button"
                className="dash-sidebar__logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          )}

          <button
            type="button"
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            <span className="theme-toggle__track" aria-hidden="true">
              <span className="theme-toggle__thumb" />
            </span>
            {!collapsed && (
              <span className="theme-toggle__label">
                {theme === "light" ? "Light" : "Dark"}
              </span>
            )}
          </button>

          <button
            type="button"
            className="dash-sidebar__collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {collapsed
                ? <polyline points="9 18 15 12 9 6" />
                : <polyline points="15 18 9 12 15 6" />}
            </svg>
          </button>
        </div>
      </aside>

      <main className="dash-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
