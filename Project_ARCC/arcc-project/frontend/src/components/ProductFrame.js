import React from "react";

const DEFAULT_ROWS = [
  { type: "match", label: "MATCH", text: "Python, data pipelines", tag: "core" },
  { type: "gap", label: "GAP", text: "Spark not found in resume", tag: "add" },
  { type: "gap", label: "GAP", text: "Add latency numbers to 1 bullet", tag: "fix" },
  { type: "match", label: "MATCH", text: "Git, CI workflows", tag: "core" },
];

function FrameChrome({ title, children }) {
  return (
    <div className="product-frame__ui">
      <div className="product-frame__ui-top">
        <span className="product-frame__dot" />
        <span className="product-frame__dot" />
        <span className="product-frame__dot" />
        <span className="product-frame__sample">Sample preview</span>
        <span className="product-frame__ui-title">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---- Variant 1: ATS analysis (score ring + matched / gap rows) ---- */
function AnalysisBody({ score, headline, subtitle, rows }) {
  return (
    <div className="product-frame__card">
      <div className="product-frame__score">
        <div
          className="product-frame__ring"
          style={{ "--score-percent": `${score}%` }}
        >
          <b>{score}</b>
        </div>
        <div className="product-frame__score-meta">
          <h4>{headline}</h4>
          <p>{subtitle}</p>
        </div>
      </div>

      {rows.map((row, index) => (
        <div className="product-frame__row" key={`${row.label}-${row.text}-${index}`}>
          <span className={`product-frame__pill product-frame__pill--${row.type}`}>
            {row.label}
          </span>
          <span>{row.text}</span>
          <span>{row.tag}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- Variant: annotated resume document (line-by-line analysis) ---- */
function ResumeBody({ headline, subtitle, file = "resume.pdf", lines = [] }) {
  return (
    <div className="product-frame__card pf-resume">
      <div className="pf-resume__bar">
        <span className="pf-resume__file">{file}</span>
        <span className="pf-resume__badge">{headline}</span>
      </div>
      {subtitle && <p className="pf-resume__sub">{subtitle}</p>}

      <div className="pf-resume__doc">
        {lines.map((line, i) => {
          if (line.kind === "name") {
            return <p key={i} className="pf-resume__name">{line.text}</p>;
          }
          if (line.kind === "role") {
            return <p key={i} className="pf-resume__role">{line.text}</p>;
          }
          if (line.kind === "section") {
            return <p key={i} className="pf-resume__section">{line.text}</p>;
          }
          if (line.kind === "bullet") {
            return (
              <div
                key={i}
                className={`pf-resume__bullet pf-resume__bullet--${line.state || "ok"}`}
              >
                <span className="pf-resume__dot" />
                <span className="pf-resume__bullet-text">{line.text}</span>
                {line.note && (
                  <span
                    className={`pf-resume__note pf-resume__note--${line.state || "ok"}`}
                  >
                    {line.note}
                  </span>
                )}
              </div>
            );
          }
          return <p key={i} className="pf-resume__text">{line.text}</p>;
        })}
      </div>
    </div>
  );
}

/* ---- Variant 2: job-fit scoring (match meter + prioritized keyword gaps) ---- */
function ScoringBody({ score, headline, subtitle, missing = [], matched = [] }) {
  return (
    <div className="product-frame__card pf-scoring">
      <div className="pf-scoring__head">
        <div className="pf-scoring__headline">
          <h4>{headline}</h4>
          <p>{subtitle}</p>
        </div>
        <span className="pf-scoring__score">{score}%</span>
      </div>

      <div className="pf-meter" role="presentation">
        <span className="pf-meter__fill" style={{ width: `${score}%` }} />
      </div>

      <p className="pf-scoring__group-label">Missing keywords · by priority</p>
      <div className="pf-chips">
        {missing.map((m, i) => (
          <span key={`${m.text}-${i}`} className={`pf-chip pf-chip--${m.priority}`}>
            {m.text}
          </span>
        ))}
      </div>

      <p className="pf-scoring__group-label">Already matched</p>
      <div className="pf-chips">
        {matched.map((m, i) => (
          <span key={`${m}-${i}`} className="pf-chip pf-chip--match">
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---- Variant 3: interview practice (chat transcript mockup) ---- */
function InterviewBody({ headline, subtitle, messages = [], progress }) {
  return (
    <div className="product-frame__card pf-interview">
      <div className="pf-interview__head">
        <div className="pf-interview__avatar" aria-hidden="true">
          RCC
        </div>
        <div className="pf-interview__headline">
          <h4>{headline}</h4>
          <p>{subtitle}</p>
        </div>
        {progress && <span className="pf-interview__progress">{progress}</span>}
      </div>

      <div className="pf-chat">
        {messages.map((m, i) => (
          <div key={`${m.type}-${i}`} className={`pf-bubble pf-bubble--${m.type}`}>
            <span className="pf-bubble__tag">{m.tag}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>

      <div className="pf-interview__bar" aria-hidden="true">
        <span className="pf-interview__mic" />
        <span className="pf-interview__input">Type or speak your answer…</span>
        <span className="pf-interview__send" />
      </div>
    </div>
  );
}

const ProductFrame = ({
  variant = "analysis",
  title = "analysis · software engineer",
  score = 75,
  headline = "Match preview",
  subtitle = "Sample analysis · upload for your real score",
  rows = DEFAULT_ROWS,
  missing = [],
  matched = [],
  messages = [],
  progress = "",
  file = "resume.pdf",
  lines = [],
  children,
  className = "",
}) => {
  const classes = ["product-frame", `product-frame--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  let body;
  if (variant === "resume") {
    body = (
      <ResumeBody
        headline={headline}
        subtitle={subtitle}
        file={file}
        lines={lines}
      />
    );
  } else if (variant === "scoring") {
    body = (
      <ScoringBody
        score={score}
        headline={headline}
        subtitle={subtitle}
        missing={missing}
        matched={matched}
      />
    );
  } else if (variant === "interview") {
    body = (
      <InterviewBody
        headline={headline}
        subtitle={subtitle}
        messages={messages}
        progress={progress}
      />
    );
  } else {
    body = (
      <AnalysisBody
        score={score}
        headline={headline}
        subtitle={subtitle}
        rows={rows}
      />
    );
  }

  return (
    <div className={classes}>
      <div className="product-frame__device">
        {children || <FrameChrome title={title}>{body}</FrameChrome>}
      </div>
    </div>
  );
};

export default ProductFrame;
