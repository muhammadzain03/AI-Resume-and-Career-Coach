import React from "react";
import Card from "../components/Card";
import Button from "../components/Button";
import ARCCLogo from "../components/ARCCLogo";

const HomePage = () => {
  return (
    <div className="page page--home">
      <section className="hero-card">
        <div className="hero-brand">
          <ARCCLogo size={76} showWordmark={false} />
          <div>
            <p className="eyebrow">Career confidence, built step by step</p>
            <h1>Make your next application sharper, faster, and more strategic.</h1>
            <p className="hero-brand__caption">
              Smart tools for resumes, roles, results, and interview readiness.
            </p>
          </div>
        </div>
        <div className="hero-actions">
          <Button>Get Started</Button>
          <Button className="btn--secondary">See Workflow</Button>
        </div>
        <div className="stats-grid">
          <Card className="stat-card">
            <span className="stat-card__value">Resume</span>
            <p>Upload and validate your latest draft in seconds.</p>
          </Card>
          <Card className="stat-card">
            <span className="stat-card__value">Match</span>
            <p>Compare your experience against role expectations.</p>
          </Card>
          <Card className="stat-card">
            <span className="stat-card__value">Practice</span>
            <p>Turn insights into interview prep you can actually use.</p>
          </Card>
        </div>
      </section>
      <Card className="feature-card">
        <h2>AI Resume and Career Coach</h2>
        <p>
          Get personalized career advice with AI-powered resume analysis and
          interview preparation.
        </p>
        <div className="feature-list">
          <span>Resume feedback</span>
          <span>Job-fit comparison</span>
          <span>Interview prompts</span>
        </div>
      </Card>
    </div>
  );
};

export default HomePage;
