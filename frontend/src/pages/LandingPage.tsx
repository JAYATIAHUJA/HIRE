import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const [activeNode, setActiveNode] = useState<string | null>(null);

  const pipelineSteps = [
    {
      id: "scrape",
      label: "Scrape",
      description: "Collects job listings across platforms",
    },
    {
      id: "match",
      label: "Match",
      description: "Vector similarity against user profile",
    },
    {
      id: "tailor",
      label: "Tailor",
      description: "LLM-powered resume customization",
    },
    {
      id: "apply",
      label: "Apply",
      description: "Playwright-based form automation",
    },
    {
      id: "track",
      label: "Track",
      description: "Application status monitoring",
    },
  ];

  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-grid">
          {/* Left Column - Content */}
          <div className="hero-left">
            <h1 className="hero-title">HIRE</h1>
            <p className="hero-subtitle">Automated job application system</p>
            <p className="hero-description">
              HIRE discovers job opportunities, matches them to your profile using vector similarity,
              generates tailored resumes with LLM assistance, and autonomously completes application
              forms through browser automation.
            </p>
            <div className="hero-actions">
              <Link to="/onboarding" className="cta-primary">
                Let's get started <span>→</span>
              </Link>
              <a
                href="https://github.com/JAYATIAHUJA/HIRE"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-secondary"
              >
                View on GitHub
              </a>
              <Link to="/feed" className="cta-secondary">
                View Feed
              </Link>
            </div>
          </div>

          <div className="hero-right">
            <div className="pipeline-visual">
              {pipelineSteps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div
                    className={`pipeline-node ${activeNode === step.id ? "active" : ""}`}
                    onMouseEnter={() => setActiveNode(step.id)}
                    onMouseLeave={() => setActiveNode(null)}
                  >
                    <div className="node-circle">{(index + 1).toString().padStart(2, '0')}</div>
                    <div className="node-label">{step.label}</div>
                    <div className="node-description">{step.description}</div>
                  </div>
                  {index < pipelineSteps.length - 1 && <div className="pipeline-connector"></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="tech-stack">
        <div className="stack-container">
          <h2 className="stack-title">Stack</h2>
          <div className="stack-grid">
            <div className="stack-group">
              <div className="stack-label">Backend</div>
              <div className="stack-items">
                <span>NestJS</span>
                <span>TypeScript</span>
                <span>TypeORM</span>
              </div>
            </div>

            <div className="stack-group">
              <div className="stack-label">Database</div>
              <div className="stack-items">
                <span>PostgreSQL</span>
                <span>pgvector</span>
              </div>
            </div>

            <div className="stack-group">
              <div className="stack-label">Automation</div>
              <div className="stack-items">
                <span>Playwright</span>
                <span>Google Gemini</span>
                <span>OpenAI</span>
              </div>
            </div>

            <div className="stack-group">
              <div className="stack-label">Frontend</div>
              <div className="stack-items">
                <span>React</span>
                <span>Vite</span>
              </div>
            </div>

            <div className="stack-group stack-highlight">
              <div className="stack-label">Open Source</div>
              <div className="stack-items">
                <span>MIT License</span>
                <span>
                  <a
                    href="https://github.com/JAYATIAHUJA/HIRE/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stack-link"
                  >
                    Contributions Welcome
                  </a>
                </span>
              </div>
            </div>

            <div className="stack-group">
              <div className="stack-label">Deployment</div>
              <div className="stack-items">
                <span>Docker</span>
                <span>docker-compose</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
