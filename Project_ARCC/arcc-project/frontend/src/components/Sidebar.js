import React from "react";
import { Link } from "react-router-dom";
import { useWorkflow } from "../context/WorkflowContext";

const Sidebar = () => {
  const { analysisId } = useWorkflow();

  const links = [
    { to: "/", label: "Home" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/upload", label: "Upload Resume" },
    { to: "/job", label: "Job Description" },
    { to: "/history", label: "Results" },
    { to: "/interview", label: "Interview" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__eyebrow">Career OS</div>
      <h2 className="sidebar__title">Plan your next move</h2>
      <p className="sidebar__copy">
        Move from resume upload to interview practice in one focused workflow.
      </p>
      <nav>
        <ul className="sidebar__nav">
          {links.map((link) => (
            <li key={link.to}>
              <Link to={link.to}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;