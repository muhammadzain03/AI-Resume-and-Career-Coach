import React from "react";
import ARCCLogo from "./ARCCLogo";

const Header = ({ theme, onToggleTheme }) => {
  return (
    <header className="header">
      <ARCCLogo size={58} />
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        <span className="theme-toggle__track" aria-hidden="true">
          <span className="theme-toggle__thumb" />
        </span>
        <span className="theme-toggle__label">{theme === "light" ? "Light mode" : "Dark mode"}</span>
      </button>
    </header>
  );
};

export default Header;
