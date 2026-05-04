import React from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const Layout = ({ children, theme, onToggleTheme }) => {
  return (
    <div className="layout">
      <Header theme={theme} onToggleTheme={onToggleTheme} />
      <div className="main-content">
        <Sidebar />
        <main className="content">{children}</main>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
