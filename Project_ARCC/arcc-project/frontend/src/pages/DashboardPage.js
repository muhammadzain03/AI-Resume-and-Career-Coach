import React from "react";
import Card from "../components/Card";

const DashboardPage = () => {
  return (
    <div className="page">
      <p className="eyebrow">Overview</p>
      <h1>Dashboard</h1>
      <div className="info-grid">
        <Card className="info-card">
          <h2>Your Progress</h2>
          <p>Track your resume analysis and interview preparation.</p>
        </Card>
        <Card className="info-card">
          <h2>Next Best Step</h2>
          <p>Upload a fresh resume before generating a new role comparison.</p>
        </Card>
        <Card className="info-card">
          <h2>Focus Area</h2>
          <p>Translate classroom projects into outcome-focused experience bullets.</p>
        </Card>
      </div>
      <Card className="feature-card">
        <h2>Your Progress</h2>
        <p>Track your resume analysis, role targeting, and interview preparation in one place.</p>
      </Card>
    </div>
  );
};

export default DashboardPage;
